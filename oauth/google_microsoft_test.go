package oauth

import (
	"testing"

	"github.com/QuantumNous/new-api/model"
	"github.com/stretchr/testify/assert"
)

// These providers persist their bindings into dedicated users-table columns.
// The bind flow in controller/oauth.go relies on the exact column name and the
// user model field that SetProviderUserID writes, so the mapping is a real
// cross-module contract worth pinning down.

func TestGoogleProvider_BindingContract(t *testing.T) {
	p := &GoogleProvider{}

	assert.Equal(t, "Google", p.GetName())
	assert.Equal(t, "google_", p.GetProviderPrefix())
	assert.Equal(t, "google_id", p.ProviderUserIDColumn())

	user := &model.User{}
	p.SetProviderUserID(user, "google-sub-123")
	assert.Equal(t, "google-sub-123", user.GoogleId)
	assert.Equal(t, "google_id", p.ProviderUserIDColumn())
}

func TestMicrosoftProvider_BindingContract(t *testing.T) {
	p := &MicrosoftProvider{}

	assert.Equal(t, "Microsoft", p.GetName())
	assert.Equal(t, "microsoft_", p.GetProviderPrefix())
	assert.Equal(t, "microsoft_id", p.ProviderUserIDColumn())

	user := &model.User{}
	p.SetProviderUserID(user, "microsoft-oid-456")
	assert.Equal(t, "microsoft-oid-456", user.MicrosoftId)
}
