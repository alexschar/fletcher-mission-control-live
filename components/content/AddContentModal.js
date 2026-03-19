"use client";

import { useState } from "react";

const PLATFORMS = ["youtube", "twitter", "tiktok", "instagram", "web", "other"];
const CONTENT_TYPES = ["transcript", "caption", "article", "post", "other"];

const INITIAL_FORM = {
  source_url: "",
  platform: "youtube",
  content_type: "transcript",
  title: "",
  raw_content: "",
};

export default function AddContentModal({ onClose, onSave }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave?.({
        ...form,
        title: form.title.trim(),
        raw_content: form.raw_content.trim(),
        source_url: form.source_url.trim(),
      });
      setForm(INITIAL_FORM);
    } catch (err) {
      setError(err.message || "Failed to create content drop");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="content-overlay content-modal-overlay" onClick={onClose}>
      <div className="content-modal" onClick={(event) => event.stopPropagation()}>
        <div className="content-panel-header">
          <div>
            <div className="content-panel-kicker">Manual Add</div>
            <h2>Add content</h2>
          </div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>

        <form className="content-form-grid" onSubmit={handleSubmit}>
          <div className="content-form-field content-form-field-full">
            <label className="field-label">Source URL</label>
            <input className="input" value={form.source_url} onChange={(event) => updateField("source_url", event.target.value)} required />
          </div>

          <div className="content-form-field">
            <label className="field-label">Platform</label>
            <select className="input" value={form.platform} onChange={(event) => updateField("platform", event.target.value)}>
              {PLATFORMS.map((platform) => (
                <option key={platform} value={platform}>{platform}</option>
              ))}
            </select>
          </div>

          <div className="content-form-field">
            <label className="field-label">Content type</label>
            <select className="input" value={form.content_type} onChange={(event) => updateField("content_type", event.target.value)}>
              {CONTENT_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="content-form-field content-form-field-full">
            <label className="field-label">Title</label>
            <input className="input" value={form.title} onChange={(event) => updateField("title", event.target.value)} />
          </div>

          <div className="content-form-field content-form-field-full">
            <label className="field-label">Raw content</label>
            <textarea
              className="input content-textarea content-textarea-lg"
              value={form.raw_content}
              onChange={(event) => updateField("raw_content", event.target.value)}
              required
            />
          </div>

          {error ? <div className="content-error">{error}</div> : null}

          <div className="content-panel-actions content-form-actions">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Create drop"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
