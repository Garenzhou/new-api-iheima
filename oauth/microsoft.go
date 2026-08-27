package oauth

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
)

func init() {
	Register("microsoft", &MicrosoftProvider{})
}

// MicrosoftProvider implements OAuth for Microsoft Entra ID (Azure AD)
type MicrosoftProvider struct{}

type microsoftOAuthResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	Scope        string `json:"scope"`
	IDToken      string `json:"id_token"`
	RefreshToken string `json:"refresh_token"`
}

type microsoftUser struct {
	Id                string `json:"id"`
	Mail              string `json:"mail"`
	Email             string `json:"email"`
	UserPrincipalName string `json:"userPrincipalName"`
	DisplayName       string `json:"displayName"`
}

func (p *MicrosoftProvider) GetName() string {
	return "Microsoft"
}

func (p *MicrosoftProvider) IsEnabled() bool {
	return common.MicrosoftOAuthEnabled
}

func (p *MicrosoftProvider) ExchangeToken(ctx context.Context, code string, c *gin.Context) (*OAuthToken, error) {
	if code == "" {
		return nil, NewOAuthError(i18n.MsgOAuthInvalidCode, nil)
	}

	logger.LogDebug(ctx, "[OAuth-Microsoft] ExchangeToken: code=%s...", code[:min(len(code), 10)])

	redirectUri := fmt.Sprintf("%s/oauth/microsoft", system_setting.ServerAddress)
	values := url.Values{}
	values.Set("client_id", common.MicrosoftClientId)
	values.Set("client_secret", common.MicrosoftClientSecret)
	values.Set("code", code)
	values.Set("grant_type", "authorization_code")
	values.Set("redirect_uri", redirectUri)
	values.Set("scope", "User.Read")

	logger.LogDebug(ctx, "[OAuth-Microsoft] ExchangeToken: redirect_uri=%s", redirectUri)

	req, err := http.NewRequestWithContext(ctx, "POST", "https://login.microsoftonline.com/common/oauth2/v2.0/token", strings.NewReader(values.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	client := http.Client{Timeout: 10 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		logger.LogError(ctx, fmt.Sprintf("[OAuth-Microsoft] ExchangeToken error: %s", err.Error()))
		return nil, NewOAuthErrorWithRaw(i18n.MsgOAuthConnectFailed, map[string]any{"Provider": "Microsoft"}, err.Error())
	}
	defer res.Body.Close()

	logger.LogDebug(ctx, "[OAuth-Microsoft] ExchangeToken response status: %d", res.StatusCode)

	var oAuthResponse microsoftOAuthResponse
	if err := common.DecodeJson(res.Body, &oAuthResponse); err != nil {
		logger.LogError(ctx, fmt.Sprintf("[OAuth-Microsoft] ExchangeToken decode error: %s", err.Error()))
		return nil, err
	}

	if oAuthResponse.AccessToken == "" {
		logger.LogError(ctx, "[OAuth-Microsoft] ExchangeToken failed: empty access token")
		return nil, NewOAuthError(i18n.MsgOAuthTokenFailed, map[string]any{"Provider": "Microsoft"})
	}

	logger.LogDebug(ctx, "[OAuth-Microsoft] ExchangeToken success: scope=%s", oAuthResponse.Scope)

	return &OAuthToken{
		AccessToken:  oAuthResponse.AccessToken,
		TokenType:    oAuthResponse.TokenType,
		RefreshToken: oAuthResponse.RefreshToken,
		ExpiresIn:    oAuthResponse.ExpiresIn,
		Scope:        oAuthResponse.Scope,
		IDToken:      oAuthResponse.IDToken,
	}, nil
}

func (p *MicrosoftProvider) GetUserInfo(ctx context.Context, token *OAuthToken) (*OAuthUser, error) {
	logger.LogDebug(ctx, "[OAuth-Microsoft] GetUserInfo: fetching user info")

	req, err := http.NewRequestWithContext(ctx, "GET", "https://graph.microsoft.com/v1.0/me", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)

	client := http.Client{Timeout: 10 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		logger.LogError(ctx, fmt.Sprintf("[OAuth-Microsoft] GetUserInfo error: %s", err.Error()))
		return nil, NewOAuthErrorWithRaw(i18n.MsgOAuthConnectFailed, map[string]any{"Provider": "Microsoft"}, err.Error())
	}
	defer res.Body.Close()

	logger.LogDebug(ctx, "[OAuth-Microsoft] GetUserInfo response status: %d", res.StatusCode)

	if res.StatusCode != http.StatusOK {
		logger.LogError(ctx, fmt.Sprintf("[OAuth-Microsoft] GetUserInfo failed: status=%d", res.StatusCode))
		return nil, NewOAuthError(i18n.MsgOAuthGetUserErr, map[string]any{"Provider": "Microsoft"})
	}

	var microsoftUser microsoftUser
	if err := common.DecodeJson(res.Body, &microsoftUser); err != nil {
		logger.LogError(ctx, fmt.Sprintf("[OAuth-Microsoft] GetUserInfo decode error: %s", err.Error()))
		return nil, err
	}

	if microsoftUser.Id == "" {
		logger.LogError(ctx, "[OAuth-Microsoft] GetUserInfo failed: empty id field")
		return nil, NewOAuthError(i18n.MsgOAuthUserInfoEmpty, map[string]any{"Provider": "Microsoft"})
	}

	email := microsoftUser.Mail
	if email == "" {
		email = microsoftUser.Email
	}
	if email == "" {
		email = microsoftUser.UserPrincipalName
	}

	logger.LogDebug(ctx, "[OAuth-Microsoft] GetUserInfo success: id=%s, email=%s, name=%s",
		microsoftUser.Id, email, microsoftUser.DisplayName)

	return &OAuthUser{
		ProviderUserID: microsoftUser.Id,
		Username:       microsoftUser.DisplayName,
		DisplayName:    microsoftUser.DisplayName,
		Email:          email,
	}, nil
}

func (p *MicrosoftProvider) IsUserIDTaken(providerUserID string) bool {
	return model.IsMicrosoftIdAlreadyTaken(providerUserID)
}

func (p *MicrosoftProvider) FillUserByProviderID(user *model.User, providerUserID string) error {
	user.MicrosoftId = providerUserID
	return user.FillUserByMicrosoftId()
}

func (p *MicrosoftProvider) SetProviderUserID(user *model.User, providerUserID string) {
	user.MicrosoftId = providerUserID
}

func (p *MicrosoftProvider) GetProviderPrefix() string {
	return "microsoft_"
}

// ProviderUserIDColumn returns the users-table column storing this provider's user ID.
func (p *MicrosoftProvider) ProviderUserIDColumn() string {
	return "microsoft_id"
}
