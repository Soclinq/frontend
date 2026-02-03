"use client";

import { useEffect, useMemo, useState } from "react";
import { MdAdd, MdDelete, MdPhone, MdVerified } from "react-icons/md";

import styles from "./styles/EmergencyContactSection.module.css";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

import { useNotify } from "@/components/utils/NotificationContext";
import { authFetch } from "@/lib/authFetch";
import { profileAdapter } from "@/lib/profileAdapter";

import type { UserProfile, EmergencyContact } from "@/types/profile";

type Props = {
  profile: UserProfile;

  /** ✅ Safe patch updater (never receives null) */
  patchProfile: (fn: (prev: UserProfile) => UserProfile) => void;

  /** ✅ Optional: full refresh from backend (if you want guaranteed sync) */
  refreshProfile?: () => Promise<void>;
};

const MAX_CONTACTS = 5;
const E164 = /^\+[1-9]\d{9,14}$/;

function safeContacts(profile: UserProfile): EmergencyContact[] {
  return profile?.settings?.emergency_contacts ?? [];
}

function mapContacts(raw: any): EmergencyContact[] {
  if (!Array.isArray(raw)) return [];

  return raw.map((c: any) => ({
    id: String(c?.id ?? ""),
    name: String(c?.name ?? ""),
    phone: String(c?.phone ?? ""),
    relationship: c?.relationship ?? "OTHER",
    priority: c?.priority ?? undefined,
    verified: Boolean(c?.verified),
    created_at: c?.created_at ?? null,
  }));
}

export default function EmergencyContactsSection({
  profile,
  patchProfile,
  refreshProfile,
}: Props) {
  const notify = useNotify();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    relationship: "FAMILY" as EmergencyContact["relationship"],
  });

  const contacts = useMemo(() => safeContacts(profile), [profile]);
  const disabledAll = loading || saving;

  const valid =
    form.name.trim().length >= 2 &&
    E164.test(form.phone.trim()) &&
    Boolean(form.relationship ?? "FAMILY");

  function setContacts(next: EmergencyContact[]) {
    patchProfile((prev) => ({
      ...prev,
      settings: {
        ...(prev.settings ?? {}),
        emergency_contacts: next,
      },
    }));
  }

  async function refreshContacts() {
    setLoading(true);

    try {
      const res = await authFetch(profileAdapter.listEmergencyContacts(), {
        method: "GET",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Unable to load contacts");

      const items = mapContacts(data?.contacts);
      setContacts(items);
    } catch {
      notify({
        type: "error",
        title: "Failed",
        message: "Could not load emergency contacts.",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addContact() {
    if (!valid || saving) return;

    if (contacts.length >= MAX_CONTACTS) {
      notify({
        type: "warning",
        title: "Limit reached",
        message: `You can only add up to ${MAX_CONTACTS} emergency contacts.`,
        duration: 2800,
      });
      return;
    }

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      relationship: form.relationship ?? "OTHER",
    };

    const snapshot = contacts;

    const temp: EmergencyContact = {
      id: `temp-${crypto.randomUUID()}`,
      name: payload.name,
      phone: payload.phone,
      relationship: payload.relationship,
      verified: false,
      created_at: new Date().toISOString(),
    };

    // ✅ optimistic add
    setContacts([...snapshot, temp]);

    setSaving(true);

    try {
      const res = await authFetch(profileAdapter.addEmergencyContact(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // rollback
        setContacts(snapshot);

        notify({
          type: "error",
          title: "Add failed",
          message: data?.error || "Unable to add emergency contact.",
          duration: 3200,
        });
        return;
      }

      notify({
        type: "success",
        title: "Added",
        message: "Emergency contact saved ✅",
        duration: 2000,
      });

      setForm({ name: "", phone: "", relationship: "FAMILY" });
      setAdding(false);

      // ✅ best sync option
      await refreshContacts();
      await refreshProfile?.();
    } catch {
      setContacts(snapshot);

      notify({
        type: "error",
        title: "Network error",
        message: "Could not add contact right now.",
        duration: 3200,
      });
    } finally {
      setSaving(false);
    }
  }

  async function removeContact(id: string) {
    if (saving) return;

    notify({
      type: "warning",
      title: "Remove contact?",
      message: "This contact will no longer receive SOS alerts.",
      duration: 6000,
      confirm: {
        label: "Remove",
        onConfirm: async () => {
          const snapshot = contacts;
          const next = contacts.filter((c) => c.id !== id);

          // ✅ optimistic remove
          setContacts(next);
          setSaving(true);

          try {
            const res = await authFetch(
              profileAdapter.deleteEmergencyContact(id),
              {
                method: "DELETE",
              }
            );

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
              // rollback
              setContacts(snapshot);

              notify({
                type: "error",
                title: "Delete failed",
                message: data?.error || "Unable to delete contact.",
                duration: 3200,
              });
              return;
            }

            notify({
              type: "success",
              title: "Removed",
              message: "Emergency contact removed ✅",
              duration: 2000,
            });

            await refreshContacts();
            await refreshProfile?.();
          } catch {
            setContacts(snapshot);

            notify({
              type: "error",
              title: "Network error",
              message: "Could not delete contact right now.",
              duration: 3200,
            });
          } finally {
            setSaving(false);
          }
        },
      },
    });
  }

  async function testPing() {
    if (saving) return;

    setSaving(true);

    try {
      const res = await authFetch(profileAdapter.testEmergencyPing(), {
        method: "POST",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        notify({
          type: "error",
          title: "Test failed",
          message: data?.error || "Unable to send test ping.",
          duration: 3200,
        });
        return;
      }

      notify({
        type: "success",
        title: "Ping sent",
        message: "Test SOS ping sent to your emergency contacts ✅",
        duration: 2400,
      });
    } catch {
      notify({
        type: "error",
        title: "Network error",
        message: "Unable to test emergency ping right now.",
        duration: 3000,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.headerRow}>
        <div>
          <h3 className={styles.title}>Emergency Contacts</h3>
          <p className={styles.muted}>
            These contacts can be notified automatically during SOS events.
          </p>
        </div>

        <button
          type="button"
          className={styles.secondaryBtn}
          disabled={disabledAll || contacts.length === 0}
          onClick={testPing}
        >
          Test SOS Ping
        </button>
      </div>

      {loading ? (
        <p className={styles.muted}>Loading contacts…</p>
      ) : contacts.length === 0 ? (
        <p className={styles.muted}>No emergency contacts added yet.</p>
      ) : (
        <div className={styles.contactList}>
          {contacts.map((c) => (
            <div key={c.id} className={styles.contactItem}>
              <div className={styles.contactInfo}>
                <strong className={styles.contactName}>{c.name}</strong>

                <small className={styles.contactMeta}>
                  <MdPhone /> {c.phone}
                  {c.verified ? (
                    <span className={styles.verified}>
                      <MdVerified /> Verified
                    </span>
                  ) : null}
                </small>

                {c.relationship ? (
                  <span className={styles.relationshipChip}>
                    {c.relationship}
                  </span>
                ) : null}
              </div>

              <button
                type="button"
                className={styles.iconDanger}
                onClick={() => removeContact(c.id)}
                disabled={disabledAll}
                aria-label="Remove contact"
              >
                <MdDelete />
              </button>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <div className={styles.card}>
          <label className={styles.label}>
            Name
            <input
              className={styles.input}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Contact name"
              disabled={disabledAll}
            />
          </label>

          <label className={styles.label}>
              Phone Number
              <PhoneInput
                international
                defaultCountry="NG"
                value={form.phone}
                onChange={(value) =>
                  setForm({ ...form, phone: value ?? "" })
                }
                className={styles.phoneWrapper}
                disabled={disabledAll}
                placeholder="Enter phone number"
              />
              <small className={styles.hint}>
                Select country then type number (auto adds +code)
              </small>
            </label>


          <label className={styles.label}>
            Relationship
            <select
              className={styles.input}
              value={form.relationship}
              disabled={disabledAll}
              onChange={(e) =>
                setForm({
                  ...form,
                  relationship: e.target.value as any,
                })
              }
            >
              <option value="FAMILY">Family</option>
              <option value="FRIEND">Friend</option>
              <option value="NEIGHBOR">Neighbor</option>
              <option value="COLLEAGUE">Colleague</option>
              <option value="OTHER">Other</option>
            </select>
          </label>

          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={!valid || disabledAll}
              onClick={addContact}
            >
              Add Contact
            </button>

            <button
              type="button"
              className={styles.secondaryBtn}
              disabled={disabledAll}
              onClick={() => setAdding(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={styles.secondaryBtn}
          disabled={disabledAll || contacts.length >= MAX_CONTACTS}
          onClick={() => setAdding(true)}
        >
          <MdAdd /> Add Emergency Contact
        </button>
      )}

      {contacts.length >= MAX_CONTACTS && (
        <p className={styles.muted}>
          Maximum of {MAX_CONTACTS} emergency contacts reached.
        </p>
      )}
    </section>
  );
}
