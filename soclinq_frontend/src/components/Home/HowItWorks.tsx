import {
    FaDownload,
    FaUsers,
    FaShieldAlt,
  } from "react-icons/fa";
  
  type Step = {
    step: number;
    title: string;
    description: string;
    icon: JSX.Element;
  };

import "./HowItWorks.css"
  
  const STEPS: Step[] = [
    {
      step: 1,
      title: "Download & Sign Up",
      description:
        "Get the app from your store and create your secure profile in seconds.",
      icon: <FaDownload />,
    },
    {
      step: 2,
      title: "Connect Your Circle",
      description:
        "Add family members or join your local community hub for updates.",
      icon: <FaUsers />,
    },
    {
      step: 3,
      title: "Stay Protected",
      description:
        "Trigger SOS alerts or report suspicious activity instantly.",
      icon: <FaShieldAlt />,
    },
  ];
  
  export default function HowItWorks(): JSX.Element {
    return (
      <section className="section how-it-works">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
  
          <div className="steps">
            {STEPS.map((step) => (
              <div key={step.step} className="step-card">
                <div className="step-badge">{step.step}</div>
  
                <div className="step-icon">{step.icon}</div>
  
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }
  