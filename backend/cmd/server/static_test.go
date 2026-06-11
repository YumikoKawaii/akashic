package main

import (
	"compress/gzip"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestWithGzipCompressesBody(t *testing.T) {
	body := strings.Repeat("akashic ", 100)
	h := withGzip(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Length", "800")
		io.WriteString(w, body)
	}))

	req := httptest.NewRequest(http.MethodGet, "/assets/index-abc.js", nil)
	req.Header.Set("Accept-Encoding", "gzip")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if got := rec.Header().Get("Content-Encoding"); got != "gzip" {
		t.Fatalf("Content-Encoding = %q, want gzip", got)
	}
	if rec.Header().Get("Content-Length") != "" {
		t.Fatalf("Content-Length should be dropped on compressed responses")
	}
	gr, err := gzip.NewReader(rec.Body)
	if err != nil {
		t.Fatalf("body is not valid gzip: %v", err)
	}
	out, err := io.ReadAll(gr)
	if err != nil {
		t.Fatalf("decompress: %v", err)
	}
	if string(out) != body {
		t.Fatalf("decompressed body differs from original")
	}
}

func TestWithGzipSkipsNotModified(t *testing.T) {
	h := withGzip(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotModified)
	}))

	req := httptest.NewRequest(http.MethodGet, "/assets/index-abc.js", nil)
	req.Header.Set("Accept-Encoding", "gzip")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotModified {
		t.Fatalf("status = %d, want 304", rec.Code)
	}
	if got := rec.Header().Get("Content-Encoding"); got != "" {
		t.Fatalf("304 must not carry Content-Encoding, got %q", got)
	}
	if rec.Body.Len() != 0 {
		t.Fatalf("304 must have an empty body, got %d bytes", rec.Body.Len())
	}
}

func TestWithGzipSkipsIncompressibleAndUnsupported(t *testing.T) {
	h := withGzip(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		io.WriteString(w, "raw")
	}))

	// Client does not accept gzip.
	req := httptest.NewRequest(http.MethodGet, "/assets/app.js", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Header().Get("Content-Encoding") != "" || rec.Body.String() != "raw" {
		t.Fatalf("response to non-gzip client should be untouched")
	}

	// Already-compressed file type.
	req = httptest.NewRequest(http.MethodGet, "/assets/font.woff2", nil)
	req.Header.Set("Accept-Encoding", "gzip")
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Header().Get("Content-Encoding") != "" || rec.Body.String() != "raw" {
		t.Fatalf("woff2 should not be re-compressed")
	}
}
