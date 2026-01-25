"use client";

import { useEffect, useState } from "react";
import { MdAdd, MdDelete, MdPhone } from "react-icons/md";
import { useUser } from "@/context/UserContext";
import styles from "./styles/EmergencyContactSection.module.css";

/* ================= TYPES ================= */
interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
}

/* ================= PLACEHOLDER API ================= */
async function saveEmergencyContact(
  contact: EmergencyContact
): Promise<boolean> {
  return new Promise((resolve) =>
    setTimeout(() => resolve(true), 600)
  );
}

async function deleteEmergencyContact(
  id: string
): Promise<boolean> {
  return new Promise((resolve) =>
    setTimeout(() => resolve(true), 600)
  );
}

/* ================= COMPONENT ================= */
export default function EmergencyContactsSection() {
  const { user } = useUser(); // ✅ READ-ONLY CONTEXT

  /* ===== LOCAL STATE (SOURCE OF TRUTH HERE) ===== */
  const [contacts, setContacts] = useState<EmergencyContact[]>(
    user?.emergencyContacts ?? []
  );
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
  });

  const MAX_CONTACTS = 5;

  /* ================= SYNC IF USER CHANGES ================= */
  useEffect(() => {
    setContacts(user?.emergencyContacts ?? []);
  }, [user?.emergencyContacts]);

  /* ================= VALIDATION ================= */
  const valid =
    form.name.trim().length >= 2 &&
    /^\+\d{10,15}$/.test(form.phone);

  /* ================= ADD ================= */
  const handleAdd = async () => {
    if (!valid) return;

    setSaving(true);

    const newContact: EmergencyContact = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      phone: form.phone,
    };

    // optimistic UI
    const snapshot = [...contacts];
    setContacts([...contacts, newContact]);

    const success = await saveEmergencyContact(newContact);

    if (!success) {
      setContacts(snapshot); // rollback
      alert("Failed to add contact.");
    } else {
      setForm({ name: "", phone: "" });
      setAdding(false);
    }

    setSaving(false);
  };

  /* ================= REMOVE ================= */
  const handleRemove = async (id: string) => {
    const ok = confirm("Remove this emergency contact?");
    if (!ok) return;

    setSaving(true);

    const snapshot = [...contacts];
    setContacts(contacts.filter((c) => c.id !== id));

    const success = await deleteEmergencyContact(id);

    if (!success) {
      setContacts(snapshot); // rollback
      alert("Failed to remove contact.");
    }

    setSaving(false);
  };

  return (
    <section className={styles.section}>
      <h3>Emergency Contacts</h3>

      <p className={styles.muted}>
        These contacts will be notified during SOS or emergencies.
      </p>

      {/* ===== EMPTY ===== */}
      {contacts.length === 0 && (
        <p className={styles.muted}>
          No emergency contacts added yet.
        </p>
      )}

      {/* ===== LIST ===== */}
      <div className={styles.contactList}>
        {contacts.map((c) => (
          <div key={c.id} className={styles.contactItem}>
            <div>
              <strong>{c.name}</strong>
              <small>
                <MdPhone /> {c.phone}
              </small>
            </div>

            <button
              className={styles.iconDanger}
              onClick={() => handleRemove(c.id)}
              disabled={saving}
              aria-label="Remove contact"
            >
              <MdDelete />
            </button>
          </div>
        ))}
      </div>

      {/* ===== ADD CONTACT ===== */}
      {adding ? (
        <div className={styles.card}>
          <label>
            Name
            <input
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
              placeholder="Contact name"
            />
          </label>

          <label>
            Phone Number
            <input
              value={form.phone}
              onChange={(e) =>
                setForm({ ...form, phone: e.target.value })
              }
              placeholder="+234…"
            />
          </label>

          <div className={styles.actionRow}>
            <button
              className={styles.primaryBtn}
              disabled={!valid || saving}
              onClick={handleAdd}
            >
              Add Contact
            </button>

            <button
              className={styles.secondaryBtn}
              onClick={() => setAdding(false)}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          className={styles.secondaryBtn}
          disabled={contacts.length >= MAX_CONTACTS}
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
