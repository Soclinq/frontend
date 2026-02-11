"use client";

import { useMemo, useState } from "react";
import { FiX, FiUploadCloud } from "react-icons/fi";
import styles from "./styles/CreateHub.module.css";
import type { LGAGroupBlock } from "./HubSelector";

export type HubCategory = "ESTATE" | "CAMPUS" | "STREET" | "OTHERS";

export type CreateHubPayload = {
  name: string;
  category: HubCategory;
  description: string;
  coverImage?: File | null;
};

interface Props {
  open: boolean;
  currentLGA: LGAGroupBlock | null;
  creating: boolean;

  onClose: () => void;
  onSubmit: (payload: CreateHubPayload) => Promise<void>;
}

export default function CreateHubModal({
  open,
  currentLGA,
  creating,
  onClose,
  onSubmit,
}: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<HubCategory>("ESTATE");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState<File | null>(null);

  const previewUrl = useMemo(() => {
    if (!coverImage) return null;
    return URL.createObjectURL(coverImage);
  }, [coverImage]);

  if (!open) return null;

  const disabled = creating || !currentLGA;

  return (
    <div className={styles.overlay}>
      <div className={styles.modalCard}>
        <header className={styles.modalTop}>
          <div>
            <h3 className={styles.modalTitle}>Create a new Hub</h3>
            <p className={styles.modalSub}>
              Under <b>{currentLGA?.lga.name ?? "your LGA"}</b>
            </p>
          </div>

          <button className={styles.iconBtn} onClick={onClose} aria-label="Close">
            <FiX />
          </button>
        </header>

        <div className={styles.modalBody}>
          {/* Name */}
          <div className={styles.field}>
            <label className={styles.label}>Hub name</label>
            <input
              className={styles.input}
              value={name}
              disabled={disabled}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Abdul Estate, BUK Campus, Zaria Street..."
            />
          </div>

          {/* Category */}
          <div className={styles.field}>
            <label className={styles.label}>Hub type</label>

            <div className={styles.pills}>
              {[
                { key: "ESTATE", label: "Estate" },
                { key: "CAMPUS", label: "Campus" },
                { key: "STREET", label: "Street" },
                { key: "OTHERS", label: "Others" },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`${styles.pill} ${category === t.key ? styles.pillActive : ""}`}
                  onClick={() => setCategory(t.key as HubCategory)}
                  disabled={disabled}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className={styles.field}>
            <label className={styles.label}>Description</label>
            <textarea
              className={styles.textarea}
              value={description}
              disabled={disabled}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell people what this hub is about..."
            />
          </div>

          {/* Upload */}
          <div className={styles.field}>
            <label className={styles.label}>Hub picture</label>

            <label className={styles.uploadBox}>
              <FiUploadCloud />
              <div>
                <p className={styles.uploadTitle}>
                  {coverImage ? coverImage.name : "Upload cover image"}
                </p>
                <p className={styles.uploadSub}>PNG, JPG (max 5MB)</p>
              </div>

              <input
                type="file"
                accept="image/*"
                disabled={disabled}
                onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
              />
            </label>

            {previewUrl && (
              <div className={styles.previewWrap}>
                <img src={previewUrl} alt="Preview" className={styles.previewImg} />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className={styles.modalActions}>
            <button className={styles.secondaryBtn} disabled={creating} onClick={onClose}>
              Cancel
            </button>

            <button
              className={styles.primaryBtn}
              disabled={creating || !name.trim() || !currentLGA}
              onClick={async () => {
                await onSubmit({
                  name: name.trim(),
                  category,
                  description: description.trim(),
                  coverImage,
                });

                // reset after success
                setName("");
                setCategory("ESTATE");
                setDescription("");
                setCoverImage(null);
              }}
            >
              {creating ? "Creating..." : "Create Hub"}
            </button>
          </div>

          <p className={styles.helperText}>
            Your hub will be created under your LGA SYSTEM hub automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
