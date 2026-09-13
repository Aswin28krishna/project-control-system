import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "pcs-app-data-v3";
const uid = () => Math.random().toString(36).slice(2, 10);
const todayISO = () => new Date().toISOString().slice(0, 10);

function daysBetween(a, b) {
  const A = new Date(a + "T00:00:00");
  const B = new Date(b + "T00:00:00");
  return Math.round((B - A) / 86400000);
}
function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}
function toCSV(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [headers.join(",")];
  rows.forEach((r) => lines.push(headers.map((h) => esc(r[h])).join(",")));
  return lines.join("\n");
}
function downloadText(filename, content, mime) {
  const blob = new Blob([content], { type: mime || "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch (e2) {
      return false;
    }
  }
}
function buildFollowupMessage(f, projectName) {
  const overdue = daysBetween(todayISO(), f.nextDue) < 0;
  const daysLate = overdue ? -daysBetween(todayISO(), f.nextDue) : 0;
  const greeting = `Hi ${f.person.split(" (")[0]},`;
  const context = `Following up on "${f.subject}" for ${projectName(f.projectId)}.`;
  const timing = overdue
    ? `This was due ${daysLate} day${daysLate === 1 ? "" : "s"} ago (last update ${fmtDate(f.lastContacted)}).`
    : `This is due today — last update was ${fmtDate(f.lastContacted)}.`;
  return `${greeting}\n\n${context} ${timing}\n\nCould you share a quick status update, or let me know if there's a blocker on your end?\n\nThanks!`;
}
function buildTaskReminder(t, projectName) {
  const overdue = daysBetween(todayISO(), t.due) < 0;
  const daysLate = overdue ? -daysBetween(todayISO(), t.due) : 0;
  const greeting = `Hi ${t.assignedTo},`;
  const context = `Checking in on "${t.name}" for ${projectName(t.projectId)} — currently at ${t.progress}%.`;
  const timing = overdue ? `It was due ${daysLate} day${daysLate === 1 ? "" : "s"} ago.` : `It's due ${fmtDate(t.due)}.`;
  return `${greeting}\n\n${context} ${timing}\n\nCould you share the latest status and flag anything blocking you?\n\nThanks!`;
}
function buildMoM(meeting, projectName) {
  const lines = [];
  lines.push(`# ${meeting.title}`, "");
  lines.push(`**Project:** ${projectName(meeting.projectId)}`);
  lines.push(`**Date:** ${fmtDate(meeting.date)}`);
  if (meeting.participants) lines.push(`**Participants:** ${meeting.participants}`);
  lines.push("", "## Discussion", meeting.discussion || "—");
  lines.push("", "## Decisions", meeting.decisions || "—");
  lines.push("", "## Action Items");
  if (meeting.actions && meeting.actions.length) {
    lines.push("| Action | Owner | Deadline | Status |", "|---|---|---|---|");
    meeting.actions.forEach((a) => lines.push(`| ${a.action} | ${a.owner} | ${fmtDate(a.deadline)} | ${a.status} |`));
  } else {
    lines.push("None.");
  }
  return lines.join("\n");
}

function seedData() {
  const p1 = uid(), p2 = uid(), p3 = uid();
  const today = todayISO();
  const plus = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const minus = (n) => plus(-n);
  return {
    projects: [
      { id: p1, name: "Riverside ERP Rollout", client: "Riverside Foods", department: "Operations", pm: "Raj Menon", coordinator: "You", start: minus(20), deadline: plus(18), priority: "High", status: "In Progress", budget: 45000, actualCost: 28000, riskLevel: "Medium" },
      { id: p2, name: "Harbor Mobile App", client: "Harbor Logistics", department: "Product", pm: "Priya Nair", coordinator: "You", start: minus(35), deadline: plus(5), priority: "High", status: "In Progress", budget: 60000, actualCost: 51000, riskLevel: "High" },
      { id: p3, name: "Atlas Data Migration", client: "Atlas Retail", department: "IT", pm: "Arun Suresh", coordinator: "You", start: minus(8), deadline: plus(40), priority: "Medium", status: "In Progress", budget: 30000, actualCost: 9000, riskLevel: "Medium" },
    ],
    tasks: [
      { id: uid(), projectId: p1, name: "Requirements sign-off", assignedTo: "Rahul", start: minus(20), due: minus(12), priority: "High", status: "Completed", progress: 100, remarks: "" },
      { id: uid(), projectId: p1, name: "Module design", assignedTo: "Anu", start: minus(12), due: minus(2), priority: "High", status: "Completed", progress: 100, remarks: "" },
      { id: uid(), projectId: p1, name: "Inventory module build", assignedTo: "Arun K", start: minus(2), due: plus(3), priority: "High", status: "In Progress", progress: 55, remarks: "Waiting on test data" },
      { id: uid(), projectId: p1, name: "UAT test cases", assignedTo: "QA Team", start: today, due: plus(9), priority: "Medium", status: "Not Started", progress: 0, remarks: "" },
      { id: uid(), projectId: p2, name: "API integration", assignedTo: "Dev Team", start: minus(10), due: minus(1), priority: "High", status: "In Progress", progress: 70, remarks: "Auth endpoint pending" },
      { id: uid(), projectId: p2, name: "Push notifications", assignedTo: "Sana", start: minus(4), due: plus(2), priority: "Medium", status: "In Progress", progress: 40, remarks: "" },
      { id: uid(), projectId: p2, name: "App store submission", assignedTo: "Priya Nair", start: plus(3), due: plus(6), priority: "High", status: "Not Started", progress: 0, remarks: "" },
      { id: uid(), projectId: p3, name: "Schema mapping", assignedTo: "Arun Suresh", start: minus(8), due: minus(1), priority: "High", status: "Completed", progress: 100, remarks: "" },
      { id: uid(), projectId: p3, name: "Migration scripts", assignedTo: "Dev Team", start: minus(1), due: plus(10), priority: "Medium", status: "In Progress", progress: 20, remarks: "" },
    ],
    followups: [
      { id: uid(), projectId: p1, person: "Rahul (Client)", subject: "Inventory field mapping approval", lastContacted: minus(1), nextDue: today, history: [{ date: minus(3), note: "Sent mapping doc" }, { date: minus(1), note: "Chased over email" }] },
      { id: uid(), projectId: p2, person: "Dev Team", subject: "Auth endpoint credentials", lastContacted: minus(2), nextDue: today, history: [{ date: minus(2), note: "Asked for prod keys" }] },
      { id: uid(), projectId: p2, person: "App Store (Priya)", subject: "Screenshots for submission", lastContacted: minus(5), nextDue: plus(1), history: [] },
      { id: uid(), projectId: p3, person: "Atlas IT", subject: "VPN access for migration", lastContacted: minus(4), nextDue: minus(1), history: [{ date: minus(4), note: "Requested access ticket" }] },
    ],
    issues: [
      { id: uid(), projectId: p1, issue: "Test data not yet provided by client", owner: "Client", reported: minus(2), priority: "High", status: "Open", expected: plus(3), impact: "Blocks inventory module testing" },
      { id: uid(), projectId: p2, issue: "Auth endpoint returns 500 on staging", owner: "Dev Team", reported: minus(1), priority: "High", status: "Open", expected: plus(1), impact: "Blocks API integration" },
      { id: uid(), projectId: p3, issue: "VPN access delayed by client IT", owner: "Atlas IT", reported: minus(4), priority: "Medium", status: "Open", expected: plus(2), impact: "Delays migration start" },
    ],
    risks: [
      { id: uid(), projectId: p1, risk: "Client approval cycle takes longer than planned", probability: "Medium", impact: "Medium", owner: "Raj Menon", mitigation: "Weekly check-in call with client sponsor", status: "Monitoring" },
      { id: uid(), projectId: p2, risk: "App store review rejects submission", probability: "Medium", impact: "High", owner: "Priya Nair", mitigation: "Pre-check guidelines, submit 2 weeks early", status: "Open" },
      { id: uid(), projectId: p2, risk: "Key developer unavailable near deadline", probability: "Low", impact: "High", owner: "Priya Nair", mitigation: "Cross-train a second developer on auth module", status: "Open" },
      { id: uid(), projectId: p3, risk: "Client IT delays infrastructure access", probability: "High", impact: "Medium", owner: "Arun Suresh", mitigation: "Escalate to client IT manager if not resolved in 3 days", status: "Open" },
    ],
    meetings: [
      {
        id: uid(), projectId: p1, title: "Weekly project review", date: minus(2), participants: "Raj Menon, Rahul (Client), Anu",
        discussion: "Inventory module is 55% complete. Client has not yet confirmed field mapping.",
        decisions: "Development deadline for inventory module pushed by 2 days.",
        actions: [
          { id: uid(), action: "Confirm field mapping with client", owner: "Rahul", deadline: today, status: "Open", taskCreated: false },
          { id: uid(), action: "Prepare UAT test cases", owner: "QA Team", deadline: plus(9), status: "Open", taskCreated: true },
        ],
      },
      {
        id: uid(), projectId: p2, title: "Sprint sync", date: minus(1), participants: "Priya Nair, Dev Team, Sana",
        discussion: "API integration blocked by staging 500 error. Push notifications on track.",
        decisions: "Dev team to pair on the auth bug tomorrow morning.",
        actions: [
          { id: uid(), action: "Fix auth endpoint 500 error", owner: "Dev Team", deadline: plus(1), status: "Open", taskCreated: false },
        ],
      },
    ],
    teamMembers: [
      { id: uid(), name: "Raj Menon", department: "Operations", manager: "VP Operations", availability: "Full-time" },
      { id: uid(), name: "Priya Nair", department: "Product", manager: "Head of Product", availability: "Full-time" },
      { id: uid(), name: "Arun Suresh", department: "IT", manager: "IT Director", availability: "Full-time" },
      { id: uid(), name: "Dev Team", department: "Engineering", manager: "Priya Nair", availability: "Shared" },
    ],
  };
}

function useAppData() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, false);
        if (res && res.value) setData(JSON.parse(res.value));
        else {
          const seed = seedData();
          await window.storage.set(STORAGE_KEY, JSON.stringify(seed), false);
          setData(seed);
        }
        setStatus("ready");
      } catch (e) {
        setData(seedData());
        setStatus("ready");
      }
    })();
  }, []);
  const persist = useCallback(async (next) => {
    setData(next);
    try { await window.storage.set(STORAGE_KEY, JSON.stringify(next), false); } catch (e) {}
  }, []);
  return { data, status, persist };
}

const STATUS_COLORS = {
  "Not Started": { bg: "#252B38", fg: "#8A93A6" },
  "Planning": { bg: "#252B38", fg: "#8A93A6" },
  "In Progress": { bg: "#1E3A4D", fg: "#6EC2E8" },
  "Waiting": { bg: "#3D3320", fg: "#E2A33B" },
  "On Hold": { bg: "#2E2438", fg: "#B18CDB" },
  "Completed": { bg: "#173B2C", fg: "#4FBF8B" },
  "Cancelled": { bg: "#3A2323", fg: "#E0596B" },
  "Delayed": { bg: "#3A2323", fg: "#E0596B" },
  "Open": { bg: "#3D3320", fg: "#E2A33B" },
  "Monitoring": { bg: "#1E3A4D", fg: "#6EC2E8" },
  "Closed": { bg: "#173B2C", fg: "#4FBF8B" },
  "Resolved": { bg: "#173B2C", fg: "#4FBF8B" },
  "Done": { bg: "#173B2C", fg: "#4FBF8B" },
};
function Badge({ children }) {
  const c = STATUS_COLORS[children] || { bg: "#252B38", fg: "#8A93A6" };
  return <span className="badge" style={{ background: c.bg, color: c.fg }}>{children}</span>;
}
function PriorityDot({ p }) {
  const c = p === "High" ? "#E0596B" : p === "Medium" ? "#E2A33B" : "#5FA8D3";
  return <span className="pdot" style={{ background: c }} title={p + " priority"} />;
}
const LEVEL_COLOR = { High: "#E0596B", Medium: "#E2A33B", Low: "#5FA8D3" };

function computeProject(p, tasks, issues, followups, risks, meetings) {
  const pt = tasks.filter((t) => t.projectId === p.id);
  const pi = issues.filter((i) => i.projectId === p.id);
  const pf = followups.filter((f) => f.projectId === p.id);
  const pr = risks.filter((r) => r.projectId === p.id);
  const pm = meetings.filter((m) => m.projectId === p.id);
  const progress = pt.length ? Math.round(pt.reduce((s, t) => s + t.progress, 0) / pt.length) : 0;
  const overdueTasks = pt.filter((t) => t.status !== "Completed" && t.status !== "Cancelled" && daysBetween(todayISO(), t.due) < 0);
  const openIssues = pi.filter((i) => i.status === "Open");
  const openRisks = pr.filter((r) => r.status !== "Closed");
  const highRisks = openRisks.filter((r) => r.probability === "High" && r.impact === "High");
  const overdueFollowups = pf.filter((f) => daysBetween(todayISO(), f.nextDue) < 0);
  const pendingActions = pm.flatMap((m) => m.actions).filter((a) => a.status !== "Done");
  const deadlinePassed = daysBetween(todayISO(), p.deadline) < 0;
  let health = "On track";
  if ((deadlinePassed && progress < 100) || overdueTasks.length >= 2) health = "Delayed";
  else if (overdueTasks.length > 0 || openIssues.some((i) => i.priority === "High") || highRisks.length > 0) health = "At risk";
  return { tasks: pt, issues: pi, followups: pf, risks: pr, meetings: pm, progress, overdueTasks, openIssues, openRisks, highRisks, overdueFollowups, pendingActions, health };
}
const HEALTH_COLOR = { "On track": "#4FBF8B", "At risk": "#E2A33B", "Delayed": "#E0596B", "Completed": "#4FBF8B", "Cancelled": "#8891A3", "On Hold": "#B18CDB" };
const MANUAL_HEALTH = ["Completed", "Cancelled", "On Hold"];
function displayHealth(project, computedHealth) {
  if (project.status && MANUAL_HEALTH.includes(project.status)) return project.status;
  return computedHealth;
}

function App() {
  const { data, status, persist } = useAppData();
  const [view, setView] = useState("cockpit");
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [projectTab, setProjectTab] = useState("overview");
  const [form, setForm] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importError, setImportError] = useState("");

  if (status === "loading" || !data) {
    return <div className="pcs-root"><style>{CSS}</style><div className="loading">Loading project control system…</div></div>;
  }
  const { projects, tasks, issues, followups, risks, meetings, teamMembers } = data;
  const update = (patch) => persist({ ...data, ...patch });
  const ask = (message, detail, onYes) => setConfirm({ message, detail, onConfirm: () => { onYes(); setConfirm(null); } });

  const addProject = (p) => update({ projects: [...projects, { ...p, id: uid() }] });
  const editProject = (id, patch) => update({ projects: projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const deleteProject = (id) => {
    const p = projects.find((x) => x.id === id);
    ask(`Delete "${p?.name}"?`, "This also deletes all of its tasks, issues, risks, follow-ups, and meetings. This can't be undone.", () => update({
      projects: projects.filter((x) => x.id !== id), tasks: tasks.filter((t) => t.projectId !== id),
      issues: issues.filter((i) => i.projectId !== id), followups: followups.filter((f) => f.projectId !== id),
      risks: risks.filter((r) => r.projectId !== id), meetings: meetings.filter((m) => m.projectId !== id),
    }));
  };

  const addTask = (t) => update({ tasks: [...tasks, { ...t, id: uid() }] });
  const editTask = (id, patch) => update({ tasks: tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  const deleteTask = (id) => ask("Delete this task?", "This can't be undone.", () => update({ tasks: tasks.filter((t) => t.id !== id) }));

  const addIssue = (i) => update({ issues: [...issues, { ...i, id: uid() }] });
  const editIssue = (id, patch) => update({ issues: issues.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  const deleteIssue = (id) => ask("Delete this issue?", "This can't be undone.", () => update({ issues: issues.filter((i) => i.id !== id) }));

  const addFollowup = (f) => update({ followups: [...followups, { ...f, id: uid(), history: [] }] });
  const editFollowup = (id, patch) => update({ followups: followups.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
  const deleteFollowup = (id) => ask("Delete this follow-up?", "Its contact history will be lost. This can't be undone.", () => update({ followups: followups.filter((f) => f.id !== id) }));
  const logContact = (id, note, nextDue) => update({
    followups: followups.map((f) => f.id === id ? { ...f, lastContacted: todayISO(), nextDue: nextDue || f.nextDue, history: [...f.history, { date: todayISO(), note }] } : f),
  });

  const addRisk = (r) => update({ risks: [...risks, { ...r, id: uid() }] });
  const editRisk = (id, patch) => update({ risks: risks.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const deleteRisk = (id) => ask("Delete this risk?", "This can't be undone.", () => update({ risks: risks.filter((r) => r.id !== id) }));

  const addMeeting = (m) => update({ meetings: [...meetings, { ...m, id: uid() }] });
  const editMeeting = (id, patch) => update({ meetings: meetings.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  const deleteMeeting = (id) => ask("Delete this meeting?", "Its minutes and action items will be lost. This can't be undone.", () => update({ meetings: meetings.filter((m) => m.id !== id) }));
  const setActionStatus = (meetingId, actionId, status) => update({
    meetings: meetings.map((m) => m.id === meetingId ? { ...m, actions: m.actions.map((a) => a.id === actionId ? { ...a, status } : a) } : m),
  });
  const createTaskFromAction = (meeting, action) => {
    addTask({ projectId: meeting.projectId, name: action.action, assignedTo: action.owner, start: todayISO(), due: action.deadline || todayISO(), priority: "Medium", status: "Not Started", progress: 0, remarks: `From meeting: ${meeting.title}` });
    editMeeting(meeting.id, { actions: meeting.actions.map((a) => a.id === action.id ? { ...a, taskCreated: true } : a) });
  };

  const addMember = (m) => update({ teamMembers: [...teamMembers, { ...m, id: uid() }] });
  const editMember = (id, patch) => update({ teamMembers: teamMembers.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  const deleteMember = (id) => ask("Remove this team member?", "This only removes their profile — their assigned tasks stay as they are.", () => update({ teamMembers: teamMembers.filter((m) => m.id !== id) }));

  const goProject = (id, tab) => { setActiveProjectId(id); setProjectTab(tab || "overview"); setView("project"); };
  const projectName = (id) => projects.find((p) => p.id === id)?.name || "—";
  const openMoM = (m) => setPreview({ title: `MoM — ${m.title}`, content: buildMoM(m, projectName), filename: `MoM-${m.title.replace(/[^a-z0-9]+/gi, "_")}.md` });

  const restoreFromFile = (file) => {
    setImportError("");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const next = {
          projects: parsed.projects || [], tasks: parsed.tasks || [], issues: parsed.issues || [],
          followups: parsed.followups || [], risks: parsed.risks || [], meetings: parsed.meetings || [],
          teamMembers: parsed.teamMembers || [],
        };
        ask("Restore from this file?", "This replaces everything currently in the app with the file's contents. This can't be undone.", () => persist(next));
      } catch (e) {
        setImportError("Couldn't read that file — make sure it's a JSON export from this tool.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="pcs-root">
      <style>{CSS}</style>
      <div className="shell">
        <Sidebar view={view} setView={setView} counts={{
          projects: projects.length,
          tasks: tasks.filter((t) => t.status !== "Completed" && t.status !== "Cancelled").length,
          followups: followups.filter((f) => daysBetween(todayISO(), f.nextDue) <= 0).length,
          issues: issues.filter((i) => i.status === "Open").length,
          risks: risks.filter((r) => r.status !== "Closed").length,
          meetings: meetings.flatMap((m) => m.actions).filter((a) => a.status !== "Done").length,
        }} />
        <main className="main">
          {view === "cockpit" && <Cockpit projects={projects} tasks={tasks} issues={issues} followups={followups} risks={risks} meetings={meetings} goProject={goProject} setView={setView} />}
          {view === "search" && <GlobalSearch projects={projects} tasks={tasks} issues={issues} followups={followups} risks={risks} meetings={meetings} projectName={projectName} goProject={goProject} />}
          {view === "projects" && <ProjectsList projects={projects} tasks={tasks} issues={issues} followups={followups} risks={risks} meetings={meetings} goProject={goProject} openForm={setForm} />}
          {view === "project" && activeProjectId && (
            <ProjectDetail
              project={projects.find((p) => p.id === activeProjectId)}
              tasks={tasks.filter((t) => t.projectId === activeProjectId)}
              issues={issues.filter((i) => i.projectId === activeProjectId)}
              followups={followups.filter((f) => f.projectId === activeProjectId)}
              risks={risks.filter((r) => r.projectId === activeProjectId)}
              meetings={meetings.filter((m) => m.projectId === activeProjectId)}
              tab={projectTab} setTab={setProjectTab} back={() => setView("projects")} openForm={setForm}
              deleteTask={deleteTask} deleteIssue={deleteIssue} deleteFollowup={deleteFollowup} deleteRisk={deleteRisk}
              logContact={logContact} setActionStatus={setActionStatus} createTaskFromAction={createTaskFromAction}
              deleteMeeting={deleteMeeting} openMoM={openMoM}
              projectNameFn={() => projects.find((p) => p.id === activeProjectId)?.name || ""}
            />
          )}
          {view === "followups" && <FollowupsGlobal followups={followups} projectName={projectName} openForm={setForm} logContact={logContact} deleteFollowup={deleteFollowup} />}
          {view === "issues" && <IssuesGlobal issues={issues} projectName={projectName} goProject={goProject} openForm={setForm} editIssue={editIssue} deleteIssue={deleteIssue} />}
          {view === "risks" && <RisksGlobal risks={risks} projectName={projectName} goProject={goProject} openForm={setForm} editRisk={editRisk} deleteRisk={deleteRisk} />}
          {view === "meetings" && <MeetingsGlobal meetings={meetings} projectName={projectName} goProject={goProject} openForm={setForm} setActionStatus={setActionStatus} createTaskFromAction={createTaskFromAction} deleteMeeting={deleteMeeting} openMoM={openMoM} />}
          {view === "team" && <TeamDirectory tasks={tasks} teamMembers={teamMembers} projectName={projectName} openForm={setForm} deleteMember={deleteMember} />}
          {view === "reports" && <Reports projects={projects} tasks={tasks} issues={issues} followups={followups} risks={risks} meetings={meetings} teamMembers={teamMembers} restoreFromFile={restoreFromFile} importError={importError} />}
        </main>
      </div>

      {form && (
        <FormModal
          form={form} close={() => setForm(null)} projects={projects}
          addProject={addProject} editProject={editProject} deleteProject={deleteProject}
          addTask={addTask} editTask={editTask}
          addIssue={addIssue} editIssue={editIssue}
          addFollowup={addFollowup} editFollowup={editFollowup}
          addRisk={addRisk} editRisk={editRisk}
          addMeeting={addMeeting} editMeeting={editMeeting}
          addMember={addMember} editMember={editMember}
        />
      )}
      {confirm && <ConfirmDialog message={confirm.message} detail={confirm.detail} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
      {preview && <TextPreviewModal title={preview.title} content={preview.content} filename={preview.filename} close={() => setPreview(null)} />}
    </div>
  );
}

function Sidebar({ view, setView, counts }) {
  const items = [
    { key: "cockpit", label: "Cockpit" },
    { key: "search", label: "Search" },
    { key: "projects", label: "Projects", count: counts.projects },
    { key: "followups", label: "Follow-ups", count: counts.followups },
    { key: "issues", label: "Issues", count: counts.issues },
    { key: "risks", label: "Risks", count: counts.risks },
    { key: "meetings", label: "Meetings", count: counts.meetings },
    { key: "team", label: "Team" },
    { key: "reports", label: "Reports" },
  ];
  return (
    <nav className="sidebar">
      <div className="brand">
        <div className="brand-mark">PC</div>
        <div className="brand-text"><div className="brand-title">Project Control</div><div className="brand-sub">follow-up &amp; delivery system</div></div>
      </div>
      <div className="nav-items">
        {items.map((it) => (
          <button key={it.key} className={"nav-item" + (view === it.key || (view === "project" && it.key === "projects") ? " active" : "")} onClick={() => setView(it.key)}>
            <span>{it.label}</span>
            {it.count > 0 && <span className="nav-count">{it.count}</span>}
          </button>
        ))}
      </div>
      <div className="sidebar-foot">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</div>
    </nav>
  );
}

function StatCard({ label, value, tone, onClick }) {
  const color = tone === "bad" ? "#E0596B" : tone === "warn" ? "#E2A33B" : tone === "good" ? "#4FBF8B" : "#E7E9EE";
  return <div className={"stat-card" + (onClick ? " clickable" : "")} onClick={onClick}><div className="stat-value" style={{ color }}>{value}</div><div className="stat-label">{label}</div></div>;
}

function ConfirmDialog({ message, detail, confirmLabel, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 400 }}>
        <div className="modal-body" style={{ paddingTop: 22 }}>
          <p style={{ fontSize: 14, fontWeight: 550, margin: "0 0 6px" }}>{message}</p>
          {detail && <p className="remark">{detail}</p>}
        </div>
        <div className="modal-foot">
          <div style={{ flex: 1 }} />
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <button className="btn ghost danger" style={{ borderColor: "#5A2A31" }} onClick={onConfirm}>{confirmLabel || "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

function TextPreviewModal({ title, content, filename, close }) {
  const [text, setText] = useState(content);
  const [copied, setCopied] = useState(false);
  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 580 }}>
        <div className="modal-head"><h2 style={{ textTransform: "none" }}>{title}</h2><button className="btn ghost sm" onClick={close}>Close</button></div>
        <div className="modal-body">
          <textarea rows={14} value={text} onChange={(e) => setText(e.target.value)} style={{ width: "100%", fontFamily: "ui-monospace, monospace", fontSize: 12, lineHeight: 1.5 }} />
        </div>
        <div className="modal-foot">
          <div style={{ flex: 1 }} />
          {filename && <button className="btn ghost" onClick={() => downloadText(filename, text, "text/markdown")}>Download</button>}
          <button className="btn primary" onClick={async () => { const ok = await copyText(text); setCopied(ok); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Copied ✓" : "Copy"}</button>
        </div>
      </div>
    </div>
  );
}

function Cockpit({ projects, tasks, issues, followups, risks, meetings, goProject, setView }) {
  const computed = projects.map((p) => ({ p, c: computeProject(p, tasks, issues, followups, risks, meetings) }));
  const activeComputed = computed.filter((x) => !MANUAL_HEALTH.includes(x.p.status));
  const pausedCount = computed.length - activeComputed.length;
  const overdue = tasks.filter((t) => t.status !== "Completed" && t.status !== "Cancelled" && daysBetween(todayISO(), t.due) < 0);
  const followToday = followups.filter((f) => daysBetween(todayISO(), f.nextDue) <= 0);
  const atRisk = activeComputed.filter((x) => x.c.health !== "On track");
  const openIssues = issues.filter((i) => i.status === "Open");
  const highRisks = risks.filter((r) => r.status !== "Closed" && r.probability === "High" && r.impact === "High");
  const pendingActions = meetings.flatMap((m) => m.actions).filter((a) => a.status !== "Done");
  const healthCounts = { "On track": 0, "At risk": 0, "Delayed": 0 };
  activeComputed.forEach((x) => healthCounts[x.c.health]++);
  const avgCompletion = projects.length ? Math.round(computed.reduce((s, x) => s + x.c.progress, 0) / projects.length) : 0;
  const onSchedulePct = activeComputed.length ? Math.round((healthCounts["On track"] / activeComputed.length) * 100) : 0;
  const budgeted = projects.filter((p) => p.budget);
  const budgetVariancePct = budgeted.length
    ? Math.round(((budgeted.reduce((s, p) => s + (p.actualCost - p.budget), 0)) / budgeted.reduce((s, p) => s + p.budget, 0)) * 100)
    : null;

  return (
    <div className="page">
      <header className="page-head"><h1>Cockpit</h1><p className="page-sub">Everything that needs your attention today, in one place.</p></header>

      <div className="stat-row">
        <StatCard label="Active projects" value={projects.length} onClick={() => setView("projects")} />
        <StatCard label="Avg completion" value={`${avgCompletion}%`} />
        <StatCard label="On schedule" value={`${onSchedulePct}%`} tone={onSchedulePct >= 70 ? "good" : "warn"} />
        <StatCard label="Overdue tasks" value={overdue.length} tone={overdue.length ? "bad" : "good"} />
        <StatCard label="Follow-ups due" value={followToday.length} tone={followToday.length ? "warn" : "good"} onClick={() => setView("followups")} />
        <StatCard label="Open issues" value={openIssues.length} tone={openIssues.length ? "warn" : "good"} onClick={() => setView("issues")} />
        <StatCard label="High risk items" value={highRisks.length} tone={highRisks.length ? "bad" : "good"} onClick={() => setView("risks")} />
        {budgetVariancePct !== null && <StatCard label="Budget variance" value={`${budgetVariancePct > 0 ? "+" : ""}${budgetVariancePct}%`} tone={budgetVariancePct > 5 ? "bad" : budgetVariancePct < -5 ? "good" : "warn"} />}
      </div>

      <div className="grid-2">
        <section className="panel">
          <h2>Needs attention</h2>
          {atRisk.length === 0 && <p className="empty">Every project is on track.</p>}
          <ul className="attn-list">
            {atRisk.map(({ p, c }) => (
              <li key={p.id} className="attn-row" onClick={() => goProject(p.id)}>
                <span className="dot" style={{ background: HEALTH_COLOR[c.health] }} />
                <div className="attn-body">
                  <div className="attn-title">{p.name}</div>
                  <div className="attn-sub">
                    {[c.overdueTasks.length > 0 && `${c.overdueTasks.length} overdue task${c.overdueTasks.length > 1 ? "s" : ""}`,
                      c.openIssues.length > 0 && `${c.openIssues.length} open issue${c.openIssues.length > 1 ? "s" : ""}`,
                      c.highRisks.length > 0 && `${c.highRisks.length} high risk`].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <span className="attn-health" style={{ color: HEALTH_COLOR[c.health] }}>{c.health}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel">
          <h2>Follow up today</h2>
          {followToday.length === 0 && <p className="empty">No follow-ups due.</p>}
          <ul className="attn-list">
            {followToday.slice(0, 8).map((f) => {
              const overdueF = daysBetween(todayISO(), f.nextDue) < 0;
              return (
                <li key={f.id} className="attn-row" onClick={() => goProject(f.projectId, "followups")}>
                  <span className="dot" style={{ background: overdueF ? "#E0596B" : "#E2A33B" }} />
                  <div className="attn-body"><div className="attn-title">{f.person}</div><div className="attn-sub">{f.subject}</div></div>
                  <span className="attn-health" style={{ color: overdueF ? "#E0596B" : "#E2A33B" }}>{overdueF ? "Overdue" : "Due today"}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="grid-2">
        <section className="panel">
          <h2>Project health</h2>
          <div className="health-bars">
            {["On track", "At risk", "Delayed"].map((h) => (
              <div key={h} className="health-row">
                <span className="health-label" style={{ color: HEALTH_COLOR[h] }}>{h}</span>
                <div className="health-track"><div className="health-fill" style={{ width: `${activeComputed.length ? (healthCounts[h] / activeComputed.length) * 100 : 0}%`, background: HEALTH_COLOR[h] }} /></div>
                <span className="health-count">{healthCounts[h]}</span>
              </div>
            ))}
          </div>
          {pausedCount > 0 && <p className="remark" style={{ marginTop: 10 }}>{pausedCount} project{pausedCount > 1 ? "s" : ""} marked Completed, Cancelled, or On Hold — excluded from this breakdown.</p>}
        </section>
        <section className="panel">
          <h2>Pending meeting actions</h2>
          {pendingActions.length === 0 && <p className="empty">No open action items.</p>}
          <ul className="attn-list">
            {pendingActions.slice(0, 8).map((a) => (
              <li key={a.id} className="attn-row" onClick={() => setView("meetings")}>
                <PriorityDot p={daysBetween(todayISO(), a.deadline) < 0 ? "High" : "Medium"} />
                <div className="attn-body"><div className="attn-title">{a.action}</div><div className="attn-sub">{a.owner}</div></div>
                <span className="attn-health">{fmtDate(a.deadline)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function GlobalSearch({ projects, tasks, issues, followups, risks, meetings, projectName, goProject }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const match = (s) => s && s.toLowerCase().includes(query);

  const results = query ? {
    projects: projects.filter((p) => match(p.name) || match(p.client)).map((p) => ({ id: p.id, title: p.name, sub: p.client, go: () => goProject(p.id) })),
    tasks: tasks.filter((t) => match(t.name) || match(t.assignedTo) || match(t.remarks)).map((t) => ({ id: t.id, title: t.name, sub: `${projectName(t.projectId)} · ${t.assignedTo}`, go: () => goProject(t.projectId, "tasks") })),
    issues: issues.filter((i) => match(i.issue) || match(i.owner) || match(i.impact)).map((i) => ({ id: i.id, title: i.issue, sub: `${projectName(i.projectId)} · ${i.owner}`, go: () => goProject(i.projectId, "issues") })),
    risks: risks.filter((r) => match(r.risk) || match(r.owner) || match(r.mitigation)).map((r) => ({ id: r.id, title: r.risk, sub: `${projectName(r.projectId)} · ${r.owner}`, go: () => goProject(r.projectId, "risks") })),
    followups: followups.filter((f) => match(f.subject) || match(f.person)).map((f) => ({ id: f.id, title: f.subject, sub: `${projectName(f.projectId)} · ${f.person}`, go: () => goProject(f.projectId, "followups") })),
    meetings: meetings.filter((m) => match(m.title) || match(m.discussion) || match(m.decisions) || match(m.participants)).map((m) => ({ id: m.id, title: m.title, sub: `${projectName(m.projectId)} · ${fmtDate(m.date)}`, go: () => goProject(m.projectId, "meetings") })),
  } : null;
  const totalResults = results ? Object.values(results).reduce((s, r) => s + r.length, 0) : 0;

  return (
    <div className="page">
      <header className="page-head"><h1>Search</h1><p className="page-sub">One box across every project, task, issue, risk, follow-up, and meeting.</p></header>
      <div className="panel" style={{ maxWidth: 560, marginBottom: 20 }}>
        <input autoFocus placeholder="Search for anything…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: "100%" }} />
      </div>
      {!query && <p className="empty">Start typing to search across everything.</p>}
      {query && totalResults === 0 && <p className="empty">No matches for "{q}".</p>}
      {query && totalResults > 0 && (
        <div className="grid-2">
          {[
            ["Projects", results.projects], ["Tasks", results.tasks], ["Issues", results.issues],
            ["Risks", results.risks], ["Follow-ups", results.followups], ["Meetings", results.meetings],
          ].filter(([, list]) => list.length > 0).map(([label, list]) => (
            <section className="panel" key={label}>
              <h2>{label} ({list.length})</h2>
              <ul className="attn-list">
                {list.slice(0, 8).map((r) => (
                  <li key={r.id} className="attn-row" onClick={r.go}>
                    <div className="attn-body"><div className="attn-title">{r.title}</div><div className="attn-sub">{r.sub}</div></div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectsList({ projects, tasks, issues, followups, risks, meetings, goProject, openForm }) {
  return (
    <div className="page">
      <header className="page-head row"><div><h1>Projects</h1><p className="page-sub">Every project you're coordinating, at a glance.</p></div>
        <button className="btn primary" onClick={() => openForm({ type: "project" })}>New project</button></header>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Project</th><th>Client</th><th>Dept</th><th>Deadline</th><th>Progress</th><th>Health</th><th>Risk level</th><th></th></tr></thead>
          <tbody>
            {projects.map((p) => {
              const c = computeProject(p, tasks, issues, followups, risks, meetings);
              return (
                <tr key={p.id} onClick={() => goProject(p.id)} className="tbl-row-click">
                  <td className="tbl-strong">{p.name}</td>
                  <td>{p.client}</td>
                  <td>{p.department}</td>
                  <td>{fmtDate(p.deadline)}</td>
                  <td style={{ width: 140 }}><div className="mini-bar"><div className="mini-fill" style={{ width: `${c.progress}%` }} /></div><span className="mini-pct">{c.progress}%</span></td>
                  <td><span style={{ color: HEALTH_COLOR[displayHealth(p, c.health)] }}>{displayHealth(p, c.health)}</span></td>
                  <td><span style={{ color: LEVEL_COLOR[p.riskLevel] }}>{p.riskLevel}</span></td>
                  <td><button className="btn ghost sm" onClick={(e) => { e.stopPropagation(); openForm({ type: "project", data: p }); }}>Edit</button></td>
                </tr>
              );
            })}
            {projects.length === 0 && <tr><td colSpan={8} className="empty">No projects yet. Create your first one.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Tabs({ tabs, active, onChange }) {
  return <div className="tabs">{tabs.map((t) => (
    <button key={t.key} className={"tab" + (active === t.key ? " active" : "")} onClick={() => onChange(t.key)}>{t.label}{t.count != null ? ` (${t.count})` : ""}</button>
  ))}</div>;
}

function ProjectDetail({ project, tasks, issues, followups, risks, meetings, tab, setTab, back, openForm, deleteTask, deleteIssue, deleteFollowup, deleteRisk, logContact, setActionStatus, createTaskFromAction, deleteMeeting, openMoM, projectNameFn }) {
  if (!project) return null;
  const c = computeProject(project, tasks, issues, followups, risks, meetings);
  return (
    <div className="page">
      <button className="back-link" onClick={back}>← All projects</button>
      <header className="page-head row">
        <div><h1>{project.name}</h1><p className="page-sub">{project.client} · {project.department} · PM {project.pm} · Coordinator {project.coordinator}</p></div>
        <span className="health-pill" style={{ color: HEALTH_COLOR[displayHealth(project, c.health)], borderColor: HEALTH_COLOR[displayHealth(project, c.health)] }}>{displayHealth(project, c.health)}</span>
      </header>
      <div className="stat-row">
        <StatCard label="Progress" value={`${c.progress}%`} />
        <StatCard label="Tasks" value={`${tasks.filter((t) => t.status === "Completed").length}/${tasks.length}`} />
        <StatCard label="Overdue tasks" value={c.overdueTasks.length} tone={c.overdueTasks.length ? "bad" : "good"} />
        <StatCard label="Open issues" value={c.openIssues.length} tone={c.openIssues.length ? "warn" : "good"} />
        <StatCard label="Open risks" value={c.openRisks.length} tone={c.openRisks.length ? "warn" : "good"} />
        <StatCard label="Deadline" value={fmtDate(project.deadline)} />
      </div>
      <Tabs tabs={[
        { key: "overview", label: "Overview" }, { key: "tasks", label: "Tasks", count: tasks.length },
        { key: "issues", label: "Issues", count: issues.length }, { key: "risks", label: "Risks", count: risks.length },
        { key: "followups", label: "Follow-ups", count: followups.length }, { key: "meetings", label: "Meetings", count: meetings.length },
      ]} active={tab} onChange={setTab} />

      {tab === "overview" && (
        <div className="grid-2">
          <section className="panel">
            <h2>Timeline &amp; budget</h2>
            <div className="timeline-row"><span>{fmtDate(project.start)}</span><div className="timeline-track"><div className="timeline-fill" style={{ width: `${c.progress}%` }} /></div><span>{fmtDate(project.deadline)}</span></div>
            <p className="empty" style={{ marginTop: 12 }}>{daysBetween(todayISO(), project.deadline) >= 0 ? `${daysBetween(todayISO(), project.deadline)} days remaining` : `${-daysBetween(todayISO(), project.deadline)} days past deadline`}</p>
            {project.budget > 0 && (
              <p className="empty">Budget {project.budget.toLocaleString()} · Spent {project.actualCost.toLocaleString()} ({Math.round((project.actualCost / project.budget) * 100)}%)</p>
            )}
          </section>
          <section className="panel">
            <h2>Open items</h2>
            <ul className="attn-list">
              {c.overdueTasks.map((t) => <li key={t.id} className="attn-row" onClick={() => setTab("tasks")}><span className="dot" style={{ background: "#E0596B" }} /><div className="attn-body"><div className="attn-title">{t.name}</div><div className="attn-sub">Overdue task · {t.assignedTo}</div></div></li>)}
              {c.openIssues.map((i) => <li key={i.id} className="attn-row" onClick={() => setTab("issues")}><span className="dot" style={{ background: "#E2A33B" }} /><div className="attn-body"><div className="attn-title">{i.issue}</div><div className="attn-sub">Open issue · owner {i.owner}</div></div></li>)}
              {c.highRisks.map((r) => <li key={r.id} className="attn-row" onClick={() => setTab("risks")}><span className="dot" style={{ background: "#E0596B" }} /><div className="attn-body"><div className="attn-title">{r.risk}</div><div className="attn-sub">High probability · high impact</div></div></li>)}
              {c.overdueFollowups.map((f) => <li key={f.id} className="attn-row" onClick={() => setTab("followups")}><span className="dot" style={{ background: "#5FA8D3" }} /><div className="attn-body"><div className="attn-title">{f.subject}</div><div className="attn-sub">Follow-up overdue · {f.person}</div></div></li>)}
              {c.overdueTasks.length + c.openIssues.length + c.highRisks.length + c.overdueFollowups.length === 0 && <p className="empty">Nothing outstanding right now.</p>}
            </ul>
          </section>
        </div>
      )}
      {tab === "tasks" && <TaskTable tasks={tasks} projectId={project.id} openForm={openForm} deleteTask={deleteTask} projectName={projectNameFn} />}
      {tab === "issues" && <IssueTable issues={issues} projectId={project.id} openForm={openForm} deleteIssue={deleteIssue} />}
      {tab === "risks" && <RiskTable risks={risks} projectId={project.id} openForm={openForm} deleteRisk={deleteRisk} />}
      {tab === "followups" && <FollowupTable followups={followups} projectId={project.id} openForm={openForm} deleteFollowup={deleteFollowup} logContact={logContact} projectName={projectNameFn} />}
      {tab === "meetings" && <MeetingList meetings={meetings} projectId={project.id} openForm={openForm} setActionStatus={setActionStatus} createTaskFromAction={createTaskFromAction} deleteMeeting={deleteMeeting} openMoM={openMoM} />}
    </div>
  );
}

const TASK_SORTS = {
  due: (a, b) => a.due.localeCompare(b.due),
  priority: (a, b) => ({ High: 0, Medium: 1, Low: 2 }[a.priority] - { High: 0, Medium: 1, Low: 2 }[b.priority]),
  progress: (a, b) => b.progress - a.progress,
  name: (a, b) => a.name.localeCompare(b.name),
};

function TaskTable({ tasks, projectId, openForm, deleteTask, projectName }) {
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [sortBy, setSortBy] = useState("due");
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState(null);

  const filtered = tasks
    .filter((t) => statusFilter === "All" || t.status === statusFilter)
    .filter((t) => priorityFilter === "All" || t.priority === priorityFilter)
    .filter((t) => !q.trim() || (t.name + " " + t.assignedTo).toLowerCase().includes(q.trim().toLowerCase()))
    .slice()
    .sort(TASK_SORTS[sortBy]);

  return (
    <div>
      <div className="table-toolbar" style={{ justifyContent: "space-between" }}>
        <div className="filter-bar">
          <input placeholder="Search tasks or people…" value={q} onChange={(e) => setQ(e.target.value)} style={{ minWidth: 180 }} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option>All</option><option>Not Started</option><option>In Progress</option><option>Waiting</option><option>Completed</option><option>On Hold</option><option>Cancelled</option>
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option>All</option><option>High</option><option>Medium</option><option>Low</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="due">Sort: Due date</option><option value="priority">Sort: Priority</option><option value="progress">Sort: Progress</option><option value="name">Sort: Name</option>
          </select>
        </div>
        <button className="btn primary" onClick={() => openForm({ type: "task", projectId })}>Add task</button>
      </div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th></th><th>Task</th><th>Assigned to</th><th>Due</th><th>Status</th><th>Progress</th><th></th></tr></thead>
          <tbody>
            {filtered.map((t) => {
              const overdue = t.status !== "Completed" && t.status !== "Cancelled" && daysBetween(todayISO(), t.due) < 0;
              return (
                <tr key={t.id}>
                  <td><PriorityDot p={t.priority} /></td>
                  <td className="tbl-strong">{t.name}{t.remarks && <div className="remark">{t.remarks}</div>}</td>
                  <td>{t.assignedTo}</td>
                  <td style={{ color: overdue ? "#E0596B" : undefined }}>{fmtDate(t.due)}</td>
                  <td><Badge>{t.status}</Badge></td>
                  <td style={{ width: 120 }}><div className="mini-bar"><div className="mini-fill" style={{ width: `${t.progress}%` }} /></div><span className="mini-pct">{t.progress}%</span></td>
                  <td className="row-actions">
                    {projectName && t.assignedTo && <button className="btn ghost sm" onClick={() => setPreview({ title: `Message — ${t.assignedTo}`, content: buildTaskReminder(t, projectName) })}>Message</button>}
                    <button className="btn ghost sm" onClick={() => openForm({ type: "task", projectId, data: t })}>Edit</button>
                    <button className="btn ghost sm danger" onClick={() => deleteTask(t.id)}>Delete</button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={7} className="empty">{tasks.length === 0 ? "No tasks yet." : "No tasks match these filters."}</td></tr>}
          </tbody>
        </table>
      </div>
      {preview && <TextPreviewModal title={preview.title} content={preview.content} close={() => setPreview(null)} />}
    </div>
  );
}

function IssueTable({ issues, projectId, openForm, deleteIssue }) {
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [sortBy, setSortBy] = useState("expected");
  const filtered = issues
    .filter((i) => statusFilter === "All" || i.status === statusFilter)
    .filter((i) => priorityFilter === "All" || i.priority === priorityFilter)
    .slice()
    .sort((a, b) => sortBy === "expected" ? a.expected.localeCompare(b.expected) : ({ High: 0, Medium: 1, Low: 2 }[a.priority] - { High: 0, Medium: 1, Low: 2 }[b.priority]));
  return (
    <div>
      <div className="table-toolbar" style={{ justifyContent: "space-between" }}>
        <div className="filter-bar">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option>All</option><option>Open</option><option>In Progress</option><option>Resolved</option><option>Closed</option>
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option>All</option><option>High</option><option>Medium</option><option>Low</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="expected">Sort: Expected resolution</option><option value="priority">Sort: Priority</option>
          </select>
        </div>
        <button className="btn primary" onClick={() => openForm({ type: "issue", projectId })}>Log issue</button>
      </div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th></th><th>Issue</th><th>Owner</th><th>Reported</th><th>Expected</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id}>
                <td><PriorityDot p={i.priority} /></td>
                <td className="tbl-strong">{i.issue}<div className="remark">{i.impact}</div></td>
                <td>{i.owner}</td><td>{fmtDate(i.reported)}</td><td>{fmtDate(i.expected)}</td>
                <td><Badge>{i.status}</Badge></td>
                <td className="row-actions"><button className="btn ghost sm" onClick={() => openForm({ type: "issue", projectId, data: i })}>Edit</button><button className="btn ghost sm danger" onClick={() => deleteIssue(i.id)}>Delete</button></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="empty">{issues.length === 0 ? "No issues logged." : "No issues match these filters."}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RiskTable({ risks, projectId, openForm, deleteRisk }) {
  return (
    <div>
      <div className="table-toolbar"><button className="btn primary" onClick={() => openForm({ type: "risk", projectId })}>Log risk</button></div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Risk</th><th>Probability</th><th>Impact</th><th>Owner</th><th>Mitigation</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {risks.map((r) => (
              <tr key={r.id}>
                <td className="tbl-strong">{r.risk}</td>
                <td style={{ color: LEVEL_COLOR[r.probability] }}>{r.probability}</td>
                <td style={{ color: LEVEL_COLOR[r.impact] }}>{r.impact}</td>
                <td>{r.owner}</td>
                <td className="remark">{r.mitigation}</td>
                <td><Badge>{r.status}</Badge></td>
                <td className="row-actions"><button className="btn ghost sm" onClick={() => openForm({ type: "risk", projectId, data: r })}>Edit</button><button className="btn ghost sm danger" onClick={() => deleteRisk(r.id)}>Delete</button></td>
              </tr>
            ))}
            {risks.length === 0 && <tr><td colSpan={7} className="empty">No risks logged. Risks are things that could happen — separate from issues, which already have.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FollowupTable({ followups, projectId, openForm, deleteFollowup, logContact, projectName }) {
  const [noteFor, setNoteFor] = useState(null);
  const [note, setNote] = useState("");
  const [nextDue, setNextDue] = useState("");
  const [msgFor, setMsgFor] = useState(null);
  const [msgText, setMsgText] = useState("");
  const [copied, setCopied] = useState(false);
  const submit = (id) => { if (!note.trim()) return; logContact(id, note.trim(), nextDue || undefined); setNoteFor(null); setNote(""); setNextDue(""); };
  const toggleMsg = (f) => {
    if (msgFor === f.id) { setMsgFor(null); return; }
    setMsgFor(f.id);
    setMsgText(buildFollowupMessage(f, projectName));
    setCopied(false);
  };
  return (
    <div>
      <div className="table-toolbar"><button className="btn primary" onClick={() => openForm({ type: "followup", projectId })}>Add follow-up</button></div>
      <div className="followup-list">
        {followups.map((f) => {
          const overdue = daysBetween(todayISO(), f.nextDue) < 0;
          return (
            <div key={f.id} className="followup-card">
              <div className="followup-head">
                <div><div className="tbl-strong">{f.subject}</div><div className="remark">{f.person} · last contacted {fmtDate(f.lastContacted)}</div></div>
                <div className="followup-head-right">
                  <span style={{ color: overdue ? "#E0596B" : "#E2A33B" }}>{overdue ? "Overdue" : "Due"} {fmtDate(f.nextDue)}</span>
                  <button className="btn ghost sm" onClick={() => openForm({ type: "followup", projectId: f.projectId, data: f })}>Edit</button>
                  <button className="btn ghost sm danger" onClick={() => deleteFollowup(f.id)}>Delete</button>
                </div>
              </div>
              {f.history.length > 0 && <ul className="history">{f.history.slice().reverse().map((h, idx) => <li key={idx}><span className="history-date">{fmtDate(h.date)}</span> {h.note}</li>)}</ul>}
              {noteFor === f.id ? (
                <div className="log-form">
                  <input placeholder="What happened? e.g. Chased again, no reply" value={note} onChange={(e) => setNote(e.target.value)} />
                  <input type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} />
                  <button className="btn primary sm" onClick={() => submit(f.id)}>Save</button>
                  <button className="btn ghost sm" onClick={() => { setNoteFor(null); setNote(""); }}>Cancel</button>
                </div>
              ) : (
                <div className="row-actions" style={{ marginTop: 4 }}>
                  <button className="btn ghost sm" onClick={() => setNoteFor(f.id)}>Log contact</button>
                  <button className="btn ghost sm" onClick={() => toggleMsg(f)}>{msgFor === f.id ? "Hide message" : "Draft message"}</button>
                </div>
              )}
              {msgFor === f.id && (
                <div className="log-form" style={{ flexDirection: "column", alignItems: "stretch", marginTop: 8 }}>
                  <textarea rows={4} value={msgText} onChange={(e) => setMsgText(e.target.value)} />
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <button className="btn primary sm" onClick={async () => { const ok = await copyText(msgText); setCopied(ok); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Copied ✓" : "Copy message"}</button>
                    <button className="btn ghost sm" onClick={() => setMsgFor(null)}>Close</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {followups.length === 0 && <p className="empty">No follow-ups tracked.</p>}
      </div>
    </div>
  );
}

function FollowupsGlobal({ followups, projectName, openForm, logContact, deleteFollowup }) {
  const sorted = [...followups].sort((a, b) => a.nextDue.localeCompare(b.nextDue));
  const dueOrOverdue = sorted.filter((f) => daysBetween(todayISO(), f.nextDue) <= 0);
  const [digest, setDigest] = useState(null);
  const openDigest = () => {
    const content = dueOrOverdue
      .map((f) => `To: ${f.person}  (${projectName(f.projectId)})\n\n${buildFollowupMessage(f, projectName)}`)
      .join("\n\n-----\n\n");
    setDigest({ title: `Today's reminders (${dueOrOverdue.length})`, content, filename: "followup-reminders.md" });
  };
  return (
    <div className="page">
      <header className="page-head row">
        <div><h1>Follow-ups</h1><p className="page-sub">Every open thread you're waiting on, across all projects.</p></div>
        {dueOrOverdue.length > 0 && <button className="btn primary" onClick={openDigest}>Draft today's reminders ({dueOrOverdue.length})</button>}
      </header>
      <FollowupTable followups={sorted} openForm={openForm} deleteFollowup={deleteFollowup} logContact={logContact} projectId={null} projectName={projectName} />
      {digest && <TextPreviewModal title={digest.title} content={digest.content} filename={digest.filename} close={() => setDigest(null)} />}
    </div>
  );
}

function IssuesGlobal({ issues, projectName, goProject, openForm, editIssue, deleteIssue }) {
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const filtered = issues
    .filter((i) => statusFilter === "All" || i.status === statusFilter)
    .filter((i) => priorityFilter === "All" || i.priority === priorityFilter);
  const open = filtered.filter((i) => i.status === "Open");
  const resolved = filtered.filter((i) => i.status !== "Open");
  return (
    <div className="page">
      <header className="page-head row">
        <div><h1>Issues</h1><p className="page-sub">Problems currently blocking work, across all projects.</p></div>
        <button className="btn primary" onClick={() => openForm({ type: "issue" })}>Log issue</button>
      </header>
      <div className="table-toolbar">
        <div className="filter-bar">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option>All</option><option>Open</option><option>In Progress</option><option>Resolved</option><option>Closed</option>
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option>All</option><option>High</option><option>Medium</option><option>Low</option>
          </select>
        </div>
      </div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th></th><th>Issue</th><th>Project</th><th>Owner</th><th>Expected</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {[...open, ...resolved].map((i) => (
              <tr key={i.id} className="tbl-row-click" onClick={() => goProject(i.projectId, "issues")}>
                <td><PriorityDot p={i.priority} /></td><td className="tbl-strong">{i.issue}</td><td>{projectName(i.projectId)}</td><td>{i.owner}</td><td>{fmtDate(i.expected)}</td>
                <td><Badge>{i.status}</Badge></td>
                <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                  {i.status === "Open" && <button className="btn ghost sm" onClick={() => editIssue(i.id, { status: "Resolved" })}>Resolve</button>}
                  <button className="btn ghost sm danger" onClick={() => deleteIssue(i.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="empty">{issues.length === 0 ? "No issues logged anywhere." : "No issues match these filters."}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RisksGlobal({ risks, projectName, goProject, openForm, editRisk, deleteRisk }) {
  const [statusFilter, setStatusFilter] = useState("All");
  const [levelFilter, setLevelFilter] = useState("All");
  const filtered = risks
    .filter((r) => statusFilter === "All" || r.status === statusFilter)
    .filter((r) => levelFilter === "All" || r.probability === levelFilter || r.impact === levelFilter);
  const open = filtered.filter((r) => r.status !== "Closed");
  const closed = filtered.filter((r) => r.status === "Closed");
  return (
    <div className="page">
      <header className="page-head row">
        <div><h1>Risks</h1><p className="page-sub">Things that could happen — tracked separately from issues that already have.</p></div>
        <button className="btn primary" onClick={() => openForm({ type: "risk" })}>Log risk</button>
      </header>
      <div className="table-toolbar">
        <div className="filter-bar">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option>All</option><option>Open</option><option>Monitoring</option><option>Closed</option>
          </select>
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
            <option value="All">Any level</option><option value="High">High probability/impact</option><option value="Medium">Medium probability/impact</option><option value="Low">Low probability/impact</option>
          </select>
        </div>
      </div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Risk</th><th>Project</th><th>Probability</th><th>Impact</th><th>Owner</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {[...open, ...closed].map((r) => (
              <tr key={r.id} className="tbl-row-click" onClick={() => goProject(r.projectId, "risks")}>
                <td className="tbl-strong">{r.risk}</td><td>{projectName(r.projectId)}</td>
                <td style={{ color: LEVEL_COLOR[r.probability] }}>{r.probability}</td>
                <td style={{ color: LEVEL_COLOR[r.impact] }}>{r.impact}</td>
                <td>{r.owner}</td><td><Badge>{r.status}</Badge></td>
                <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                  {r.status !== "Closed" && <button className="btn ghost sm" onClick={() => editRisk(r.id, { status: "Closed" })}>Close</button>}
                  <button className="btn ghost sm danger" onClick={() => deleteRisk(r.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="empty">{risks.length === 0 ? "No risks logged anywhere." : "No risks match these filters."}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MeetingList({ meetings, projectId, openForm, setActionStatus, createTaskFromAction, deleteMeeting, openMoM }) {
  return (
    <div>
      <div className="table-toolbar"><button className="btn primary" onClick={() => openForm({ type: "meeting", projectId })}>Log meeting</button></div>
      <div className="followup-list">
        {meetings.slice().sort((a, b) => b.date.localeCompare(a.date)).map((m) => (
          <div key={m.id} className="followup-card">
            <div className="followup-head">
              <div><div className="tbl-strong">{m.title}</div><div className="remark">{fmtDate(m.date)}{m.participants ? ` · ${m.participants}` : ""}</div></div>
              <div className="followup-head-right">
                <button className="btn ghost sm" onClick={() => openMoM(m)}>Generate MoM</button>
                <button className="btn ghost sm" onClick={() => openForm({ type: "meeting", projectId: m.projectId, data: m })}>Edit</button>
                <button className="btn ghost sm danger" onClick={() => deleteMeeting(m.id)}>Delete</button>
              </div>
            </div>
            {m.discussion && <p className="remark" style={{ marginTop: 8 }}><strong>Discussion:</strong> {m.discussion}</p>}
            {m.decisions && <p className="remark"><strong>Decisions:</strong> {m.decisions}</p>}
            {m.actions.length > 0 && (
              <table className="tbl action-tbl">
                <thead><tr><th>Action</th><th>Owner</th><th>Deadline</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {m.actions.map((a) => (
                    <tr key={a.id}>
                      <td>{a.action}</td><td>{a.owner}</td><td>{fmtDate(a.deadline)}</td>
                      <td><Badge>{a.status}</Badge></td>
                      <td className="row-actions">
                        {a.status !== "Done" && <button className="btn ghost sm" onClick={() => setActionStatus(m.id, a.id, "Done")}>Mark done</button>}
                        {!a.taskCreated && <button className="btn ghost sm" onClick={() => createTaskFromAction(m, a)}>Send to tasks</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
        {meetings.length === 0 && <p className="empty">No meetings logged for this project.</p>}
      </div>
    </div>
  );
}

function MeetingsGlobal({ meetings, projectName, goProject, openForm, setActionStatus, createTaskFromAction, deleteMeeting, openMoM }) {
  return (
    <div className="page">
      <header className="page-head row">
        <div><h1>Meetings</h1><p className="page-sub">Minutes of meeting and action items, across all projects.</p></div>
        <button className="btn primary" onClick={() => openForm({ type: "meeting" })}>Log meeting</button>
      </header>
      <div className="followup-list">
        {meetings.slice().sort((a, b) => b.date.localeCompare(a.date)).map((m) => (
          <div key={m.id} className="followup-card">
            <div className="followup-head">
              <div><div className="tbl-strong">{m.title}</div><div className="remark">{projectName(m.projectId)} · {fmtDate(m.date)}{m.participants ? ` · ${m.participants}` : ""}</div></div>
              <div className="followup-head-right">
                <button className="btn ghost sm" onClick={() => openMoM(m)}>Generate MoM</button>
                <button className="btn ghost sm" onClick={() => goProject(m.projectId, "meetings")}>Open project</button>
              </div>
            </div>
            {m.discussion && <p className="remark" style={{ marginTop: 8 }}><strong>Discussion:</strong> {m.discussion}</p>}
            {m.decisions && <p className="remark"><strong>Decisions:</strong> {m.decisions}</p>}
            {m.actions.length > 0 && (
              <table className="tbl action-tbl">
                <thead><tr><th>Action</th><th>Owner</th><th>Deadline</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {m.actions.map((a) => (
                    <tr key={a.id}>
                      <td>{a.action}</td><td>{a.owner}</td><td>{fmtDate(a.deadline)}</td><td><Badge>{a.status}</Badge></td>
                      <td className="row-actions">
                        {a.status !== "Done" && <button className="btn ghost sm" onClick={() => setActionStatus(m.id, a.id, "Done")}>Mark done</button>}
                        {!a.taskCreated && <button className="btn ghost sm" onClick={() => createTaskFromAction(m, a)}>Send to tasks</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
        {meetings.length === 0 && <p className="empty">No meetings logged yet.</p>}
      </div>
    </div>
  );
}

function TeamDirectory({ tasks, teamMembers, projectName, openForm, deleteMember }) {
  const byPerson = {};
  tasks.forEach((t) => { if (!t.assignedTo) return; byPerson[t.assignedTo] = byPerson[t.assignedTo] || []; byPerson[t.assignedTo].push(t); });
  const namesFromTasks = Object.keys(byPerson);
  const memberNames = new Set(teamMembers.map((m) => m.name));
  const allNames = [...new Set([...teamMembers.map((m) => m.name), ...namesFromTasks])].sort();

  return (
    <div className="page">
      <header className="page-head row"><div><h1>Team</h1><p className="page-sub">Workload by person, plus employee details you've recorded.</p></div>
        <button className="btn primary" onClick={() => openForm({ type: "member" })}>Add team member</button></header>
      <div className="team-grid">
        {allNames.map((name) => {
          const list = byPerson[name] || [];
          const active = list.filter((t) => t.status !== "Completed" && t.status !== "Cancelled");
          const overdue = active.filter((t) => daysBetween(todayISO(), t.due) < 0);
          const projects = [...new Set(list.map((t) => projectName(t.projectId)))];
          const member = teamMembers.find((m) => m.name === name);
          return (
            <div key={name} className="panel team-card">
              <div className="followup-head">
                <div className="team-name">{name}</div>
                {member && <div className="row-actions"><button className="btn ghost sm" onClick={() => openForm({ type: "member", data: member })}>Edit</button><button className="btn ghost sm danger" onClick={() => deleteMember(member.id)}>Delete</button></div>}
              </div>
              {member && <div className="remark">{member.department} · reports to {member.manager} · {member.availability}</div>}
              <div className="team-stats"><span><strong>{active.length}</strong> active</span><span style={{ color: overdue.length ? "#E0596B" : undefined }}><strong>{overdue.length}</strong> overdue</span></div>
              {projects.length > 0 && <div className="remark">{projects.join(" · ")}</div>}
            </div>
          );
        })}
        {allNames.length === 0 && <p className="empty">No team members yet.</p>}
      </div>
    </div>
  );
}

function projectLookup(projects) { const m = {}; projects.forEach((p) => (m[p.id] = p)); return m; }

function buildExportTables(projects, tasks, issues, followups, risks, meetings) {
  const byId = projectLookup(projects);
  const projectsRows = projects.map((p) => {
    const c = computeProject(p, tasks, issues, followups, risks, meetings);
    return { project_id: p.id, project: p.name, client: p.client, department: p.department, pm: p.pm, start_date: p.start, deadline: p.deadline,
      priority: p.priority, status: p.status, budget: p.budget, actual_cost: p.actualCost, risk_level: p.riskLevel,
      progress_pct: c.progress, health: c.health, open_tasks: c.tasks.filter((t) => t.status !== "Completed" && t.status !== "Cancelled").length,
      overdue_tasks: c.overdueTasks.length, open_issues: c.openIssues.length, open_risks: c.openRisks.length, open_followups: c.followups.length };
  });
  const tasksRows = tasks.map((t) => { const p = byId[t.projectId]; const overdue = t.status !== "Completed" && t.status !== "Cancelled" && daysBetween(todayISO(), t.due) < 0;
    return { task_id: t.id, project_id: t.projectId, project: p ? p.name : "", task: t.name, assigned_to: t.assignedTo, priority: t.priority, status: t.status, progress_pct: t.progress, start_date: t.start, due_date: t.due, overdue: overdue ? "Yes" : "No", remarks: t.remarks || "" }; });
  const issuesRows = issues.map((i) => { const p = byId[i.projectId]; return { issue_id: i.id, project_id: i.projectId, project: p ? p.name : "", issue: i.issue, impact: i.impact, owner: i.owner, priority: i.priority, status: i.status, reported_date: i.reported, expected_resolution: i.expected }; });
  const followupsRows = followups.map((f) => { const p = byId[f.projectId]; const overdue = daysBetween(todayISO(), f.nextDue) < 0;
    return { followup_id: f.id, project_id: f.projectId, project: p ? p.name : "", person: f.person, subject: f.subject, last_contacted: f.lastContacted, next_due: f.nextDue, overdue: overdue ? "Yes" : "No", contact_count: f.history.length, last_note: f.history.length ? f.history[f.history.length - 1].note : "" }; });
  const risksRows = risks.map((r) => { const p = byId[r.projectId]; return { risk_id: r.id, project_id: r.projectId, project: p ? p.name : "", risk: r.risk, probability: r.probability, impact: r.impact, owner: r.owner, mitigation: r.mitigation, status: r.status }; });
  const meetingActionRows = meetings.flatMap((m) => { const p = byId[m.projectId]; return m.actions.map((a) => ({ meeting_id: m.id, project_id: m.projectId, project: p ? p.name : "", meeting: m.title, meeting_date: m.date, action: a.action, owner: a.owner, deadline: a.deadline, status: a.status, task_created: a.taskCreated ? "Yes" : "No" })); });
  return { projectsRows, tasksRows, issuesRows, followupsRows, risksRows, meetingActionRows };
}

function Reports({ projects, tasks, issues, followups, risks, meetings, teamMembers, restoreFromFile, importError }) {
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const project = projects.find((p) => p.id === projectId);
  const c = project ? computeProject(project, tasks, issues, followups, risks, meetings) : null;
  const tables = buildExportTables(projects, tasks, issues, followups, risks, meetings);

  const exportAll = () => {
    downloadText("projects.csv", toCSV(tables.projectsRows));
    downloadText("tasks.csv", toCSV(tables.tasksRows));
    downloadText("issues.csv", toCSV(tables.issuesRows));
    downloadText("followups.csv", toCSV(tables.followupsRows));
    downloadText("risks.csv", toCSV(tables.risksRows));
    downloadText("meeting_actions.csv", toCSV(tables.meetingActionRows));
  };

  return (
    <div className="page">
      <header className="page-head"><h1>Reports</h1><p className="page-sub">A weekly summary you can read out, plus data exports for Power BI.</p></header>
      <div className="panel" style={{ maxWidth: 560 }}>
        <label className="field-label">Project</label>
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      </div>

      {project && c && (
        <section className="panel report-box">
          <h2>{project.name} — weekly summary</h2>
          <p className="remark">Progress: <strong>{c.progress}%</strong> · Deadline {fmtDate(project.deadline)} · Risk level {project.riskLevel}</p>
          <div className="report-cols">
            <div><h3>Completed</h3><ul>{c.tasks.filter((t) => t.status === "Completed").map((t) => <li key={t.id}>{t.name}</li>)}{c.tasks.filter((t) => t.status === "Completed").length === 0 && <li className="remark">None yet</li>}</ul></div>
            <div><h3>In progress</h3><ul>{c.tasks.filter((t) => t.status === "In Progress").map((t) => <li key={t.id}>{t.name} — {t.progress}%</li>)}{c.tasks.filter((t) => t.status === "In Progress").length === 0 && <li className="remark">None</li>}</ul></div>
            <div><h3>Overdue</h3><ul>{c.overdueTasks.map((t) => <li key={t.id} style={{ color: "#E0596B" }}>{t.name}</li>)}{c.overdueTasks.length === 0 && <li className="remark">None</li>}</ul></div>
          </div>
          <p className="remark">Open issues: <strong>{c.openIssues.length}</strong> · Open risks: <strong>{c.openRisks.length}</strong> · Follow-ups pending: <strong>{c.followups.length}</strong> · Pending actions: <strong>{c.pendingActions.length}</strong></p>
        </section>
      )}
      {projects.length === 0 && <p className="empty">Create a project to generate a report.</p>}

      <section className="panel" style={{ marginTop: 16 }}>
        <h2>Export for Power BI</h2>
        <p className="remark" style={{ marginBottom: 14 }}>
          Downloads flat CSVs of everything below — one row per record, project details already joined in.
          In Power BI Desktop: <strong>Get Data → Text/CSV</strong>, pick a file, then <strong>Load</strong>.
          Put all six in one folder and use <strong>Get Data → Folder</strong> to load them together.
          Re-export and refresh whenever your data changes — this tool has no live server, so Power BI can't auto-refresh from it directly.
        </p>
        <div className="export-row">
          <button className="btn ghost sm" onClick={() => downloadText("projects.csv", toCSV(tables.projectsRows))}>projects.csv ({tables.projectsRows.length})</button>
          <button className="btn ghost sm" onClick={() => downloadText("tasks.csv", toCSV(tables.tasksRows))}>tasks.csv ({tables.tasksRows.length})</button>
          <button className="btn ghost sm" onClick={() => downloadText("issues.csv", toCSV(tables.issuesRows))}>issues.csv ({tables.issuesRows.length})</button>
          <button className="btn ghost sm" onClick={() => downloadText("followups.csv", toCSV(tables.followupsRows))}>followups.csv ({tables.followupsRows.length})</button>
          <button className="btn ghost sm" onClick={() => downloadText("risks.csv", toCSV(tables.risksRows))}>risks.csv ({tables.risksRows.length})</button>
          <button className="btn ghost sm" onClick={() => downloadText("meeting_actions.csv", toCSV(tables.meetingActionRows))}>meeting_actions.csv ({tables.meetingActionRows.length})</button>
        </div>
        <div className="export-row" style={{ marginTop: 8 }}>
          <button className="btn primary sm" onClick={exportAll}>Download all six CSVs</button>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 16, maxWidth: 640 }}>
        <h2>Backup &amp; restore</h2>
        <p className="remark" style={{ marginBottom: 14 }}>
          Everything is stored only in this browser. Download a full backup regularly, and keep it somewhere safe —
          it's also how you move your data to another device.
        </p>
        <div className="export-row">
          <button className="btn ghost sm" onClick={() => downloadText("project-control-backup.json", JSON.stringify({ projects, tasks, issues, followups, risks, meetings, teamMembers }, null, 2), "application/json")}>Download full backup (.json)</button>
          <label className="btn ghost sm" style={{ cursor: "pointer" }}>
            Restore from backup
            <input type="file" accept="application/json" style={{ display: "none" }} onChange={(e) => { if (e.target.files[0]) restoreFromFile(e.target.files[0]); e.target.value = ""; }} />
          </label>
        </div>
        {importError && <p className="remark" style={{ color: "#E0596B", marginTop: 8 }}>{importError}</p>}
      </section>
    </div>
  );
}

function FormModal({ form, close, projects, addProject, editProject, deleteProject, addTask, editTask, addIssue, editIssue, addFollowup, editFollowup, addRisk, editRisk, addMeeting, editMeeting, addMember, editMember }) {
  const isEdit = !!form.data;
  const [vals, setVals] = useState(() => defaultsFor(form, projects));
  const set = (k) => (e) => setVals({ ...vals, [k]: e.target.value });

  const addActionRow = () => setVals({ ...vals, actions: [...vals.actions, { id: uid(), action: "", owner: "", deadline: todayISO(), status: "Open", taskCreated: false }] });
  const updateActionRow = (idx, field, value) => setVals({ ...vals, actions: vals.actions.map((a, i) => (i === idx ? { ...a, [field]: value } : a)) });
  const removeActionRow = (idx) => setVals({ ...vals, actions: vals.actions.filter((_, i) => i !== idx) });

  const submit = () => {
    const pid = form.projectId || vals.projectId;
    if (form.type === "project") { if (!vals.name) return; const payload = { ...vals, budget: Number(vals.budget) || 0, actualCost: Number(vals.actualCost) || 0 }; isEdit ? editProject(form.data.id, payload) : addProject(payload); }
    else if (form.type === "task") { if (!vals.name || !pid) return; const payload = { ...vals, projectId: pid, progress: Number(vals.progress) }; isEdit ? editTask(form.data.id, payload) : addTask(payload); }
    else if (form.type === "issue") { if (!vals.issue || !pid) return; const payload = { ...vals, projectId: pid }; isEdit ? editIssue(form.data.id, payload) : addIssue(payload); }
    else if (form.type === "followup") { if (!vals.subject || !pid) return; const payload = { ...vals, projectId: pid }; isEdit ? editFollowup(form.data.id, payload) : addFollowup(payload); }
    else if (form.type === "risk") { if (!vals.risk || !pid) return; const payload = { ...vals, projectId: pid }; isEdit ? editRisk(form.data.id, payload) : addRisk(payload); }
    else if (form.type === "meeting") { if (!vals.title || !pid) return; const payload = { ...vals, projectId: pid }; isEdit ? editMeeting(form.data.id, payload) : addMeeting(payload); }
    else if (form.type === "member") { if (!vals.name) return; isEdit ? editMember(form.data.id, vals) : addMember(vals); }
    close();
  };

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h2>{isEdit ? "Edit" : "New"} {form.type}</h2><button className="btn ghost sm" onClick={close}>Close</button></div>
        <div className="modal-body">
          {!form.projectId && ["task", "issue", "risk", "followup", "meeting"].includes(form.type) && (
            <Field label="Project">
              <select value={vals.projectId || ""} onChange={set("projectId")}>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
          )}
          {form.type === "project" && (
            <>
              <Field label="Project name"><input value={vals.name} onChange={set("name")} placeholder="e.g. Riverside ERP Rollout" /></Field>
              <div className="field-row"><Field label="Client"><input value={vals.client} onChange={set("client")} /></Field><Field label="Department / business unit"><input value={vals.department} onChange={set("department")} /></Field></div>
              <div className="field-row"><Field label="Project manager"><input value={vals.pm} onChange={set("pm")} /></Field><Field label="Coordinator"><input value={vals.coordinator} onChange={set("coordinator")} /></Field></div>
              <div className="field-row"><Field label="Start date"><input type="date" value={vals.start} onChange={set("start")} /></Field><Field label="Deadline"><input type="date" value={vals.deadline} onChange={set("deadline")} /></Field></div>
              <div className="field-row">
                <Field label="Priority"><select value={vals.priority} onChange={set("priority")}><option>High</option><option>Medium</option><option>Low</option></select></Field>
                <Field label="Status"><select value={vals.status} onChange={set("status")}><option>Not Started</option><option>Planning</option><option>In Progress</option><option>On Hold</option><option>Delayed</option><option>Completed</option><option>Cancelled</option></select></Field>
                <Field label="Risk level"><select value={vals.riskLevel} onChange={set("riskLevel")}><option>High</option><option>Medium</option><option>Low</option></select></Field>
              </div>
              <div className="field-row"><Field label="Budget"><input type="number" min="0" value={vals.budget} onChange={set("budget")} /></Field><Field label="Actual cost"><input type="number" min="0" value={vals.actualCost} onChange={set("actualCost")} /></Field></div>
            </>
          )}
          {form.type === "task" && (
            <>
              <Field label="Task name"><input value={vals.name} onChange={set("name")} placeholder="e.g. UAT test cases" /></Field>
              <div className="field-row"><Field label="Assigned to"><input value={vals.assignedTo} onChange={set("assignedTo")} /></Field><Field label="Priority"><select value={vals.priority} onChange={set("priority")}><option>High</option><option>Medium</option><option>Low</option></select></Field></div>
              <div className="field-row"><Field label="Start date"><input type="date" value={vals.start} onChange={set("start")} /></Field><Field label="Due date"><input type="date" value={vals.due} onChange={set("due")} /></Field></div>
              <div className="field-row"><Field label="Status"><select value={vals.status} onChange={set("status")}><option>Not Started</option><option>In Progress</option><option>Waiting</option><option>Completed</option><option>On Hold</option><option>Cancelled</option></select></Field><Field label="Progress %"><input type="number" min="0" max="100" value={vals.progress} onChange={set("progress")} /></Field></div>
              <Field label="Remarks"><input value={vals.remarks} onChange={set("remarks")} placeholder="Optional note" /></Field>
            </>
          )}
          {form.type === "issue" && (
            <>
              <Field label="Issue"><input value={vals.issue} onChange={set("issue")} placeholder="What's blocking work?" /></Field>
              <Field label="Impact"><input value={vals.impact} onChange={set("impact")} placeholder="What does this block?" /></Field>
              <div className="field-row"><Field label="Owner"><input value={vals.owner} onChange={set("owner")} /></Field><Field label="Priority"><select value={vals.priority} onChange={set("priority")}><option>High</option><option>Medium</option><option>Low</option></select></Field></div>
              <div className="field-row"><Field label="Reported"><input type="date" value={vals.reported} onChange={set("reported")} /></Field><Field label="Expected resolution"><input type="date" value={vals.expected} onChange={set("expected")} /></Field></div>
              <Field label="Status"><select value={vals.status} onChange={set("status")}><option>Open</option><option>In Progress</option><option>Resolved</option><option>Closed</option></select></Field>
            </>
          )}
          {form.type === "risk" && (
            <>
              <Field label="Risk"><input value={vals.risk} onChange={set("risk")} placeholder="What could happen?" /></Field>
              <div className="field-row"><Field label="Probability"><select value={vals.probability} onChange={set("probability")}><option>High</option><option>Medium</option><option>Low</option></select></Field><Field label="Impact"><select value={vals.impact} onChange={set("impact")}><option>High</option><option>Medium</option><option>Low</option></select></Field></div>
              <Field label="Owner"><input value={vals.owner} onChange={set("owner")} /></Field>
              <Field label="Mitigation"><input value={vals.mitigation} onChange={set("mitigation")} placeholder="What are you doing about it?" /></Field>
              <Field label="Status"><select value={vals.status} onChange={set("status")}><option>Open</option><option>Monitoring</option><option>Closed</option></select></Field>
            </>
          )}
          {form.type === "followup" && (
            <>
              <Field label="Person / party"><input value={vals.person} onChange={set("person")} placeholder="Who are you waiting on?" /></Field>
              <Field label="Subject"><input value={vals.subject} onChange={set("subject")} placeholder="What is it about?" /></Field>
              <div className="field-row"><Field label="Last contacted"><input type="date" value={vals.lastContacted} onChange={set("lastContacted")} /></Field><Field label="Next follow-up due"><input type="date" value={vals.nextDue} onChange={set("nextDue")} /></Field></div>
            </>
          )}
          {form.type === "meeting" && (
            <>
              <Field label="Meeting title"><input value={vals.title} onChange={set("title")} placeholder="e.g. Weekly project review" /></Field>
              <div className="field-row"><Field label="Date"><input type="date" value={vals.date} onChange={set("date")} /></Field><Field label="Participants"><input value={vals.participants} onChange={set("participants")} placeholder="Comma-separated names" /></Field></div>
              <Field label="Discussion"><textarea rows={2} value={vals.discussion} onChange={set("discussion")} placeholder="What was discussed?" /></Field>
              <Field label="Decisions"><textarea rows={2} value={vals.decisions} onChange={set("decisions")} placeholder="What was decided?" /></Field>
              <div className="field-label" style={{ margin: "10px 0 6px" }}>Action items</div>
              {vals.actions.map((a, idx) => (
                <div key={a.id} className="action-row">
                  <input placeholder="Action" value={a.action} onChange={(e) => updateActionRow(idx, "action", e.target.value)} />
                  <input placeholder="Owner" value={a.owner} onChange={(e) => updateActionRow(idx, "owner", e.target.value)} />
                  <input type="date" value={a.deadline} onChange={(e) => updateActionRow(idx, "deadline", e.target.value)} />
                  <button type="button" className="btn ghost sm danger" onClick={() => removeActionRow(idx)}>Remove</button>
                </div>
              ))}
              <button type="button" className="btn ghost sm" onClick={addActionRow}>Add action item</button>
            </>
          )}
          {form.type === "member" && (
            <>
              <Field label="Name"><input value={vals.name} onChange={set("name")} placeholder="Match this to how it appears in Assigned to" /></Field>
              <Field label="Department"><input value={vals.department} onChange={set("department")} /></Field>
              <Field label="Reports to"><input value={vals.manager} onChange={set("manager")} /></Field>
              <Field label="Availability"><select value={vals.availability} onChange={set("availability")}><option>Full-time</option><option>Part-time</option><option>Shared</option><option>Contractor</option></select></Field>
            </>
          )}
        </div>
        <div className="modal-foot">
          {isEdit && form.type === "project" && <button className="btn ghost danger" onClick={() => { deleteProject(form.data.id); close(); }}>Delete project</button>}
          <div style={{ flex: 1 }} />
          <button className="btn ghost" onClick={close}>Cancel</button>
          <button className="btn primary" onClick={submit}>{isEdit ? "Save changes" : "Create"}</button>
        </div>
      </div>
    </div>
  );
}

function defaultsFor(form, projects) {
  const d = form.data; const today = todayISO();
  const pid = form.projectId || (d && d.projectId) || (projects && projects[0] && projects[0].id) || "";
  if (form.type === "project") return d ? { ...d } : { name: "", client: "", department: "", pm: "", coordinator: "You", start: today, deadline: today, priority: "Medium", status: "Not Started", budget: 0, actualCost: 0, riskLevel: "Medium" };
  if (form.type === "task") return d ? { ...d, progress: String(d.progress) } : { projectId: pid, name: "", assignedTo: "", priority: "Medium", start: today, due: today, status: "Not Started", progress: "0", remarks: "" };
  if (form.type === "issue") return d ? { ...d } : { projectId: pid, issue: "", impact: "", owner: "", priority: "Medium", reported: today, expected: today, status: "Open" };
  if (form.type === "risk") return d ? { ...d } : { projectId: pid, risk: "", probability: "Medium", impact: "Medium", owner: "", mitigation: "", status: "Open" };
  if (form.type === "followup") return d ? { ...d } : { projectId: pid, person: "", subject: "", lastContacted: today, nextDue: today };
  if (form.type === "meeting") return d ? { participants: "", ...d } : { projectId: pid, title: "", date: today, participants: "", discussion: "", decisions: "", actions: [] };
  if (form.type === "member") return d ? { ...d } : { name: "", department: "", manager: "", availability: "Full-time" };
  return {};
}

function Field({ label, children }) { return <label className="field"><span className="field-label">{label}</span>{children}</label>; }

const CSS = `
.pcs-root { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; background: #12151C; color: #E7E9EE; min-height: 100vh; }
.loading { padding: 40px; color: #8891A3; }
.shell { display: flex; min-height: 100vh; }
.sidebar { width: 220px; flex-shrink: 0; background: #161A22; border-right: 1px solid #232A38; padding: 20px 14px; display: flex; flex-direction: column; }
.brand { display: flex; align-items: center; gap: 10px; padding: 4px 6px 22px; border-bottom: 1px solid #232A38; margin-bottom: 14px; }
.brand-mark { width: 34px; height: 34px; border-radius: 8px; background: #E2A33B; color: #2A1D06; font-weight: 700; font-size: 13px; display: flex; align-items: center; justify-content: center; letter-spacing: -0.02em; }
.brand-title { font-weight: 650; font-size: 14.5px; letter-spacing: -0.01em; }
.brand-sub { font-size: 11.5px; color: #6B7488; margin-top: 1px; }
.nav-items { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.nav-item { display: flex; justify-content: space-between; align-items: center; padding: 9px 10px; border-radius: 7px; background: transparent; border: none; color: #A9B1C3; font-size: 13.5px; text-align: left; cursor: pointer; }
.nav-item:hover { background: #1D2330; color: #E7E9EE; }
.nav-item.active { background: #212A3D; color: #E7E9EE; font-weight: 550; }
.nav-count { font-size: 11px; background: #2A3242; color: #8891A3; padding: 1px 7px; border-radius: 20px; }
.nav-item.active .nav-count { background: #E2A33B; color: #2A1D06; }
.sidebar-foot { font-size: 11.5px; color: #5B6478; padding: 10px 6px 0; border-top: 1px solid #232A38; margin-top: 10px; }
.main { flex: 1; min-width: 0; padding: 28px 36px 60px; }
.page { max-width: 1150px; }
.page-head { margin-bottom: 22px; }
.page-head.row { display: flex; justify-content: space-between; align-items: flex-end; }
.page-head h1 { font-size: 23px; font-weight: 650; letter-spacing: -0.015em; margin: 0 0 5px; }
.page-sub { font-size: 13.5px; color: #8891A3; margin: 0; }
.back-link { background: none; border: none; color: #6B7488; font-size: 12.5px; cursor: pointer; padding: 0; margin-bottom: 10px; }
.back-link:hover { color: #E7E9EE; }
.stat-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-bottom: 22px; }
.stat-card { background: #1A1F29; border: 1px solid #232A38; border-radius: 10px; padding: 14px 16px; }
.stat-card.clickable { cursor: pointer; }
.stat-card.clickable:hover { border-color: #33405B; }
.stat-value { font-size: 22px; font-weight: 650; letter-spacing: -0.02em; }
.stat-label { font-size: 12px; color: #8891A3; margin-top: 2px; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.panel { background: #1A1F29; border: 1px solid #232A38; border-radius: 10px; padding: 18px 20px; }
.panel h2 { font-size: 14.5px; font-weight: 600; margin: 0 0 12px; }
.empty { color: #5B6478; font-size: 13px; padding: 6px 0; }
.attn-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.attn-row { display: flex; align-items: center; gap: 10px; padding: 8px 6px; border-radius: 7px; cursor: pointer; }
.attn-row:hover { background: #212836; }
.dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.attn-body { flex: 1; min-width: 0; }
.attn-title { font-size: 13.5px; font-weight: 500; }
.attn-sub { font-size: 12px; color: #8891A3; margin-top: 1px; }
.attn-health { font-size: 12px; font-weight: 550; flex-shrink: 0; }
.health-bars { display: flex; flex-direction: column; gap: 12px; }
.health-row { display: flex; align-items: center; gap: 10px; }
.health-label { font-size: 12.5px; width: 76px; flex-shrink: 0; }
.health-track { flex: 1; height: 7px; background: #232A38; border-radius: 4px; overflow: hidden; }
.health-fill { height: 100%; border-radius: 4px; }
.health-count { font-size: 12.5px; color: #8891A3; width: 18px; text-align: right; }
.table-wrap { background: #1A1F29; border: 1px solid #232A38; border-radius: 10px; overflow: hidden; overflow-x: auto; }
.table-toolbar { display: flex; justify-content: flex-end; margin-bottom: 12px; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; font-weight: 550; color: #8891A3; font-size: 11.5px; padding: 10px 14px; border-bottom: 1px solid #232A38; white-space: nowrap; }
.tbl td { padding: 11px 14px; border-bottom: 1px solid #1F2530; vertical-align: middle; }
.tbl tr:last-child td { border-bottom: none; }
.tbl-row-click { cursor: pointer; }
.tbl-row-click:hover { background: #1D2330; }
.tbl-strong { font-weight: 500; }
.remark { font-size: 11.5px; color: #6B7488; margin-top: 2px; }
.row-actions { display: flex; gap: 6px; white-space: nowrap; }
.pdot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.badge { font-size: 11px; font-weight: 550; padding: 3px 9px; border-radius: 20px; white-space: nowrap; }
.mini-bar { width: 100%; height: 5px; background: #232A38; border-radius: 3px; overflow: hidden; }
.mini-fill { height: 100%; background: #5FA8D3; border-radius: 3px; }
.mini-pct { font-size: 11px; color: #8891A3; }
.tabs { display: flex; gap: 4px; border-bottom: 1px solid #232A38; margin-bottom: 18px; overflow-x: auto; }
.tab { background: none; border: none; color: #8891A3; font-size: 13px; padding: 9px 4px; margin-right: 18px; cursor: pointer; border-bottom: 2px solid transparent; white-space: nowrap; }
.tab:hover { color: #E7E9EE; }
.tab.active { color: #E7E9EE; border-bottom-color: #E2A33B; font-weight: 550; }
.health-pill { border: 1px solid; border-radius: 20px; padding: 4px 12px; font-size: 12.5px; font-weight: 550; }
.timeline-row { display: flex; align-items: center; gap: 10px; font-size: 12px; color: #8891A3; }
.timeline-track { flex: 1; height: 6px; background: #232A38; border-radius: 4px; overflow: hidden; }
.timeline-fill { height: 100%; background: #4FBF8B; border-radius: 4px; }
.followup-list { display: flex; flex-direction: column; gap: 10px; }
.followup-card { background: #1A1F29; border: 1px solid #232A38; border-radius: 10px; padding: 14px 16px; }
.followup-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
.followup-head-right { display: flex; align-items: center; gap: 8px; font-size: 12.5px; flex-shrink: 0; }
.history { list-style: none; margin: 10px 0 0; padding: 10px 0 0; border-top: 1px solid #232A38; font-size: 12px; color: #A9B1C3; display: flex; flex-direction: column; gap: 4px; }
.history-date { color: #5B6478; margin-right: 6px; }
.log-form { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
.log-form input:not([type="date"]) { flex: 1; min-width: 180px; }
.action-tbl { margin-top: 12px; border-top: 1px solid #232A38; }
.action-tbl th, .action-tbl td { padding: 8px 6px; font-size: 12.5px; }
.action-row { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; }
.action-row input:first-child { flex: 2; }
.action-row input { flex: 1; }
.team-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.team-card { padding: 16px 18px; }
.team-name { font-weight: 600; font-size: 14.5px; margin-bottom: 4px; }
.team-stats { display: flex; gap: 16px; font-size: 12.5px; color: #8891A3; margin: 8px 0 6px; }
.team-stats strong { color: #E7E9EE; font-size: 14px; }
.report-box { margin-top: 16px; max-width: 760px; }
.report-box h2 { font-size: 16px; }
.report-cols { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin: 14px 0; }
.report-cols h3 { font-size: 12px; color: #8891A3; margin: 0 0 6px; font-weight: 600; }
.report-cols ul { margin: 0; padding-left: 16px; font-size: 12.5px; display: flex; flex-direction: column; gap: 3px; }
.export-row { display: flex; gap: 8px; flex-wrap: wrap; }
.filter-bar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.filter-bar select, .filter-bar input { font-size: 12.5px; padding: 6px 9px; }
input, select, textarea { background: #12151C; border: 1px solid #2A3242; color: #E7E9EE; border-radius: 6px; padding: 8px 10px; font-size: 13px; font-family: inherit; outline: none; }
textarea { width: 100%; resize: vertical; }
input:focus, select:focus, textarea:focus { border-color: #E2A33B; }
.field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; flex: 1; }
.field-label { font-size: 11.5px; color: #8891A3; }
.field-row { display: flex; gap: 12px; }
.btn { border-radius: 7px; padding: 8px 14px; font-size: 13px; font-weight: 500; cursor: pointer; border: 1px solid #2A3242; background: #1A1F29; color: #E7E9EE; }
.btn:hover { border-color: #3A4460; }
.btn.primary { background: #E2A33B; border-color: #E2A33B; color: #2A1D06; font-weight: 600; }
.btn.primary:hover { background: #EDB456; }
.btn.ghost { background: transparent; }
.btn.ghost.danger { color: #E0596B; }
.btn.sm { padding: 5px 10px; font-size: 12px; }
.modal-overlay { position: fixed; inset: 0; background: rgba(8,10,14,0.6); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 20px; }
.modal { background: #181D27; border: 1px solid #2A3242; border-radius: 12px; width: 520px; max-width: 100%; max-height: 88vh; overflow-y: auto; }
.modal-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #232A38; }
.modal-head h2 { font-size: 15px; font-weight: 600; margin: 0; text-transform: capitalize; }
.modal-body { padding: 18px 20px; }
.modal-foot { display: flex; gap: 8px; padding: 14px 20px; border-top: 1px solid #232A38; }
@media (max-width: 760px) {
  .shell { flex-direction: column; }
  .sidebar { width: 100%; flex-direction: row; align-items: center; overflow-x: auto; padding: 12px; }
  .brand { border-bottom: none; margin-bottom: 0; padding: 0 10px 0 0; }
  .nav-items { flex-direction: row; }
  .sidebar-foot { display: none; }
  .main { padding: 18px; }
  .grid-2 { grid-template-columns: 1fr; }
  .report-cols { grid-template-columns: 1fr; }
  .action-row { flex-wrap: wrap; }
}
`;

export default App;
