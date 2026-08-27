package i18n

import (
	"strings"
	"testing"
)

func TestNormalizeLang(t *testing.T) {
	cases := []struct {
		in   string
		want string
	}{
		{"", DefaultLang},
		{"en", LangEn},
		{"en-US", LangEn},
		{"EN_us", LangEn},
		{"zh", LangZhCN},
		{"zh-CN", LangZhCN},
		// Note: the Go-side normalizeLang only branches on the "zh-tw" prefix
		// for the Traditional Chinese case; other "zh-*" region tags fall
		// through to the generic "zh" branch and resolve to LangZhCN.
		// (Region→script mapping for the frontend lives in
		// web/src/i18n/languages.ts convertDetectedLanguage.)
		{"zh-TW", LangZhTW},
		{"zh-HK", LangZhCN},
		{"ar", LangAr},
		{"ar-SA", LangAr},
		{"ar-EG", LangAr},
		{"AR-ae", LangAr},
		{"ko", LangKo},
		{"ko-KR", LangKo},
		{"KO-kr", LangKo},
		{"fr", DefaultLang},
		{"xx-YY", DefaultLang},
	}
	for _, c := range cases {
		got := normalizeLang(c.in)
		if got != c.want {
			t.Errorf("normalizeLang(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}

func TestIsSupported(t *testing.T) {
	// normalizeLang always maps to one of the four supported languages (or
	// DefaultLang = LangEn, which is itself supported), so IsSupported is
	// effectively always true for non-empty input. The contract is: the
	// supported set is closed under normalizeLang.
	for _, lang := range []string{LangZhCN, LangZhTW, LangEn, LangAr, LangKo, "en", "zh", "zh-TW", "ar", "ar-SA", "ko", "ko-KR", "fr", "ja", "xx-YY", ""} {
		if !IsSupported(lang) {
			t.Errorf("IsSupported(%q) = false, want true (normalizeLang maps every input to a supported language)", lang)
		}
	}
	// Explicit unsupported codes do not exist: there is no public mapping
	// to a 5th language. We assert the supported-set contract instead by
	// confirming the function's return is consistent with SupportedLanguages.
	supported := SupportedLanguages()
	for _, lang := range []string{LangZhCN, LangZhTW, LangEn, LangAr, LangKo} {
		found := false
		for _, s := range supported {
			if lang == s {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("SupportedLanguages() = %v, expected to contain %q", supported, lang)
		}
	}
}

func TestParseAcceptLanguage(t *testing.T) {
	cases := []struct {
		in   string
		want string
	}{
		{"", DefaultLang},
		{"ar,en;q=0.5", LangAr},
		{"ar-SA,en;q=0.8", LangAr},
		{"en-US,en;q=0.9", LangEn},
		{"zh-CN,zh;q=0.9", LangZhCN},
		{"zh-TW,zh;q=0.9", LangZhTW},
		{"fr,en;q=0.5", DefaultLang},
	}
	for _, c := range cases {
		got := ParseAcceptLanguage(c.in)
		if got != c.want {
			t.Errorf("ParseAcceptLanguage(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}

func TestSupportedLanguagesIncludesAr(t *testing.T) {
	found := false
	for _, lang := range SupportedLanguages() {
		if lang == LangAr {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("SupportedLanguages() = %v, expected to contain %q", SupportedLanguages(), LangAr)
	}
}

// Sanity: the prefix branch in normalizeLang must come before the default branch,
// so a tag like "ar" (no region) is still mapped to LangAr.
func TestNormalizeLangArPrefixIsReachable(t *testing.T) {
	if !strings.HasPrefix("ar", "ar") {
		t.Fatalf("strings.HasPrefix precondition failed")
	}
	if got := normalizeLang("ar"); got != LangAr {
		t.Errorf("normalizeLang(\"ar\") = %q, want %q", got, LangAr)
	}
}
