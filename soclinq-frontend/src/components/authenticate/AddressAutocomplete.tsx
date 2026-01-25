"use client";

import { useState } from "react";
import { FaMapMarkerAlt } from "react-icons/fa";

type Address = {
  house_number?: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  lga?: string;
  state?: string;
  country: string;
  postal_code?: string;
  full_address: string;
  lat: number;
  lng: number;
};

type Props = {
  value: string;
  onSelect: (addr: Address) => void;
};

export default function AddressAutocompleteMapbox({ value, onSelect }: Props) {
  const [results, setResults] = useState<any[]>([]);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

  const search = async (q: string) => {
    if (q.length < 3) return;

    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        q
      )}.json?country=ng&types=address,poi&limit=5&access_token=${token}`
    );

    const data = await res.json();
    setResults(data.features || []);
  };

  const parseAddress = (f: any): Address => {
    const ctx = f.context || [];

    const find = (prefix: string) =>
      ctx.find((c: any) => c.id.startsWith(prefix))?.text;

    return {
      house_number: f.address,
      street: f.text,
      neighborhood: find("neighborhood"),
      city: find("place"),
      lga: find("locality") || find("district"),
      state: find("region"),
      country: find("country") || "Nigeria",
      postal_code: find("postcode"),
      full_address: f.place_name,
      lat: f.center[1],
      lng: f.center[0],
    };
  };

  return (
    <div className="address-wrapper">
      <div className="input-group">
        <span className="left-icon">
          <FaMapMarkerAlt />
        </span>
        <input
          placeholder="Search street / house / landmark"
          value={value}
          onChange={(e) => search(e.target.value)}
        />
      </div>

      {results.length > 0 && (
        <ul className="address-dropdown">
          {results.map((r) => (
            <li
              key={r.id}
              onClick={() => {
                onSelect(parseAddress(r));
                setResults([]);
              }}
            >
              {r.place_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
