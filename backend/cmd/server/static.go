package main

import (
	"compress/gzip"
	"net/http"
	"path"
	"strings"
)

// withCacheControl sets a Cache-Control header before delegating.
func withCacheControl(value string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", value)
		next.ServeHTTP(w, r)
	})
}

// compressible reports whether a static path is worth gzipping. Extensionless
// paths are SPA routes that resolve to index.html.
func compressible(p string) bool {
	switch path.Ext(p) {
	case "", ".html", ".js", ".css", ".svg", ".json", ".map", ".txt", ".xml":
		return true
	}
	return false
}

// withGzip compresses static responses for clients that accept it. Only the
// static handlers use this — Connect negotiates its own compression.
func withGzip(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") || !compressible(r.URL.Path) {
			next.ServeHTTP(w, r)
			return
		}
		// Range responses cannot be combined with on-the-fly compression.
		r.Header.Del("Range")

		w.Header().Set("Content-Encoding", "gzip")
		w.Header().Add("Vary", "Accept-Encoding")

		gz := gzip.NewWriter(w)
		gw := &gzipResponseWriter{ResponseWriter: w, gz: gz}
		next.ServeHTTP(gw, r)
		if !gw.skip {
			gz.Close()
		}
	})
}

// gzipResponseWriter routes the body through a gzip writer. Bodyless
// statuses (304 from If-Modified-Since revalidation) skip compression —
// closing the gzip writer would still emit a footer, which a 304 forbids.
type gzipResponseWriter struct {
	http.ResponseWriter
	gz          *gzip.Writer
	skip        bool
	wroteHeader bool
}

func (w *gzipResponseWriter) WriteHeader(code int) {
	if w.wroteHeader {
		return
	}
	w.wroteHeader = true
	if code == http.StatusNotModified || code == http.StatusNoContent {
		w.skip = true
		w.Header().Del("Content-Encoding")
	} else {
		// The file server sets the uncompressed size; the gzip stream's
		// length is unknown up front.
		w.Header().Del("Content-Length")
	}
	w.ResponseWriter.WriteHeader(code)
}

func (w *gzipResponseWriter) Write(b []byte) (int, error) {
	if !w.wroteHeader {
		w.WriteHeader(http.StatusOK)
	}
	if w.skip {
		return w.ResponseWriter.Write(b)
	}
	return w.gz.Write(b)
}
