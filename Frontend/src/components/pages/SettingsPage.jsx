import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ListOrdered, Settings2, Users, ShieldCheck, ArrowRight, Landmark, GraduationCap, FileText, KeyRound } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import "./SettingsPage.css";

export default function SettingsPage() {
  const navigate = useNavigate();

  const settingsCards = [
    {
      id: "board-academic-year",
      title: "Board & Academic Year Management",
      description: "Create, edit and manage education boards, board codes, academic years, date ranges and status.",
      icon: Landmark,
      to: "/dashboard/board-academic-year",
      buttonText: "Manage Board & Academic Year",
      primary: true,
    },
    {
      id: "number-series",
      title: "ID & Number Series",
      description: "Configure Employee IDs, Admission Numbers and Roll Number formats.",
      icon: ListOrdered,
      to: "/dashboard/settings/number-series",
      buttonText: "Manage Number Series",
      primary: true,
    },
    {
      id: "templates",
      title: "Templates",
      description: "Manage certificate templates, document templates and downloadable bulk-upload templates.",
      icon: FileText,
      to: "/dashboard/settings/templates",
      buttonText: "Manage Templates",
      primary: true,
    },
    {
      id: "credentials",
      title: "Credentials Generator",
      description: "Generate, manage, preview and send login credentials for faculty and students in bulk.",
      icon: KeyRound,
      to: "/dashboard/settings/credentials",
      buttonText: "Manage Credentials",
      primary: true,
    },
    {
      id: "general",
      title: "General Settings",
      description: "Configure institution details, academic defaults and system preferences.",
      icon: Settings2,
      to: "/dashboard/settings/general",
      buttonText: "Manage General Settings",
      primary: false,
    },
    {
      id: "users",
      title: "User Management",
      description: "Manage admin accounts, role permissions and system access controls.",
      icon: Users,
      to: "/dashboard/settings/user-management",
      buttonText: "Manage User Roles",
      primary: false,
    },
    {
      id: "audit",
      title: "Audit Logs",
      description: "View system audit trail, security events and administrator activity logs.",
      icon: ShieldCheck,
      to: "/dashboard/settings/audit-logs",
      buttonText: "View Audit Logs",
      primary: false,
    },
  ];

  return (
    <DashboardLayout
      title="Settings"
      subtitle="Manage system configurations, numbering rules, user permissions and preferences."
      breadcrumb={["Home", "Settings"]}
    >
      <main className="settings-dashboard-container">
        <section className="settings-grid">
          {settingsCards.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.id} className={`settings-card ${card.primary ? "is-featured" : ""}`}>
                <div className="settings-card-header">
                  <div className="settings-card-icon">
                    <Icon size={20} />
                  </div>
                  <h3>{card.title}</h3>
                </div>
                <p>{card.description}</p>
                <div className="settings-card-footer">
                  <button
                    type="button"
                    className={`cms-btn ${card.primary ? "cms-btn-primary" : "cms-btn-ghost"}`}
                    onClick={() => navigate(card.to)}
                  >
                    {card.buttonText} <ArrowRight size={14} />
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </DashboardLayout>
  );
}

