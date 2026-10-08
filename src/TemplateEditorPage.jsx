import { useParams, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import TemplateBuilder1Gov from "./TemplateBuilder1Gov";
import { useData } from "./DataContext";
import {
  updateDraft,
  publishDraft,
  startNewVersionFromCurrent,
} from "./templateStore";
import { sendableProfiles } from "./settingsStore";
import { can } from "./authStore";

/**
 * Full-screen editor page mounted at /app/templates/:id/edit
 * Navigates back to /app/templates on save / back.
 */

export default function TemplateEditorPage({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { templates, setTemplates, profiles, auth, toast } = useData();

  const active = useMemo(
    () => templates.find((t) => t.id === id) || null,
    [templates, id]
  );

  // Ensure the template has a draft to edit
  useMemo(() => {
    if (active && !active.draft) {
      setTemplates((l) => startNewVersionFromCurrent(l, id));
    }
  }, [active?.id]); // eslint-disable-line

  const role = auth.roles.find((r) => r.id === user?.roleId) || auth.roles[0];
  const canManage = can(role, "templates", "manage");

  if (!active) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Poppins, sans-serif", color: "#888" }}>
        Template not found. <button onClick={() => navigate("/app/templates")} style={{ marginLeft: 12, color: "#055F36", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>← Back to library</button>
      </div>
    );
  }

  const saveDraft = ({ subject, blocks, global }) => {
    setTemplates((l) => updateDraft(l, id, { subject, blocks, global }));
    toast && toast("Draft saved.");
    navigate("/app/templates");
  };

  const publish = ({ subject, blocks, global }) => {
    setTemplates((l) => publishDraft(updateDraft(l, id, { subject, blocks, global }), id));
    toast && toast("Template published as a new version.");
    navigate("/app/templates");
  };

  const goBack = () => navigate("/app/templates");

  const sendProfiles = sendableProfiles(profiles);
  const adminRole = auth.roles.find((r) => r.id === "role_admin");
  const userCanAdmin = adminRole && can(adminRole, "admin", "manage");

  return (
    <div style={{ height: "100vh", width: "100vw", overflow: "hidden" }}>
      <TemplateBuilder1Gov
        key={id}
        initialSubject={active.draft?.subject ?? ""}
        initialBlocks={
          active.draft?.blocks?.length && active.draft.blocks[0]?.props
            ? active.draft.blocks
            : undefined
        }
        initialGlobalFont={active.draft?.global}
        onBack={goBack}
        onSaveDraft={canManage ? saveDraft : undefined}
        onPublish={canManage ? publish : undefined}
        deliveryReady={sendProfiles.length > 0}
        sendProfiles={sendProfiles}
        onGoToSettings={userCanAdmin ? () => navigate("/app/admin") : null}
        toast={toast}
      />
    </div>
  );
}
