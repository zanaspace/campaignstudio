import * as React from "react";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { Toaster } from "@/components/ui/Toast";
import { can, useSessionUserId, useStudioPermissions } from "@/lib/studio/access";
import { StudioShell, MODULE_NAV } from "@/shell/StudioShell";
import { Login } from "@/shell/Login";
import { TemplateLibrary } from "@/studio/components/TemplateLibrary";
import { TemplateHistory } from "@/studio/components/TemplateHistory";
import { TemplateCompare } from "@/studio/components/TemplateCompare";
import { EmailBuilder } from "@/studio/components/EmailBuilder";
import { StudioCampaigns } from "@/studio/components/StudioCampaigns";
import { StudioCampaignDetail } from "@/studio/components/StudioCampaignDetail";
import { StudioContacts } from "@/studio/components/StudioContacts";
import { StudioIntegrations } from "@/studio/components/StudioIntegrations";
import { StudioAdmin } from "@/studio/components/StudioAdmin";

/** Sends signed-out visitors to /login. */
function RequireSession({ children }: { children: React.ReactNode }) {
  return useSessionUserId() ? <>{children}</> : <Navigate to="/login" replace />;
}
/** "/" opens the first module the user's role can view (as in the original app). */
function Home() {
  const { role } = useStudioPermissions("templates");
  const first = MODULE_NAV.find((m) => can(role, m.id, "view"));
  return <Navigate to={first?.to ?? "/templates"} replace />;
}
const withId = (C: React.ComponentType<{ id: string }>) => function WithId() { const { id = "" } = useParams(); return <C id={id} />; };
const History = withId(TemplateHistory);
const Compare = withId(TemplateCompare);
const Editor = withId(EmailBuilder);
const CampaignDetail = withId(StudioCampaignDetail);

const shell = (el: React.ReactNode) => <RequireSession><StudioShell>{el}</StudioShell></RequireSession>;

export default function App() {
  const signedIn = !!useSessionUserId();
  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route path="/login" element={signedIn ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/" element={<RequireSession><Home /></RequireSession>} />
        <Route path="/templates" element={shell(<TemplateLibrary />)} />
        <Route path="/templates/:id" element={shell(<History />)} />
        <Route path="/templates/:id/compare" element={shell(<Compare />)} />
        {/* Full-screen editor: no sidebar, as in the CRM */}
        <Route path="/templates/:id/edit" element={<RequireSession><Editor /></RequireSession>} />
        <Route path="/campaigns" element={shell(<StudioCampaigns />)} />
        <Route path="/campaigns/:id" element={shell(<CampaignDetail />)} />
        <Route path="/contacts" element={shell(<StudioContacts />)} />
        <Route path="/integrations" element={shell(<StudioIntegrations />)} />
        <Route path="/admin" element={shell(<StudioAdmin />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
