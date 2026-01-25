"use client";

import styles from "./styles/Sos.module.css";
import SosControls from "./SosControls";
import SosReplay from "./SosReplay";
import SosMap from "./SosMap";

export default function Sos() {


  return (
    <section className={styles.sos}>
      <SosControls />
      
      <SosMap/>
    </section>
  );
}
