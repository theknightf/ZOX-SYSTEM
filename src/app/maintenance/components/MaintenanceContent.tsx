'use client';
import React, { useState } from 'react';
import {
  ClipboardList,
  PlayCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Plus,
  X,
  Wrench,
  AlertTriangle,
  User,
  MapPin,
  Calendar,
  FolderOpen,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import {
  maintenanceApi,
  staffApi,
  useAsyncData,
  toastApiError,
  type UiMaintenanceTask,
} from '@/lib/api';

type MaintenanceTask = UiMaintenanceTask;

type StatusFilter = 'All' | MaintenanceTask['status'];

const statusFilters: StatusFilter[] = ['All', 'Open', 'In Progress', 'Done', 'Cancelled'];

const priorityStyles: Record<MaintenanceTask['priority'], string> = {
  Low: 'bg-info/10 text-info border border-info/20',
  Medium: 'bg-accent/10 text-accent border border-accent/20',
  High: 'bg-warning/10 text-warning border border-warning/20',
  Urgent: 'bg-danger/10 text-danger border border-danger/20',
};

const taskStatusStyles: Record<MaintenanceTask['status'], string> = {
  Open: 'bg-warning/10 text-warning border border-warning/20',
  'In Progress': 'bg-primary/10 text-primary border border-primary/20',
  Done: 'bg-accent/10 text-accent border border-accent/20',
  Cancelled: 'bg-muted text-muted-foreground border border-border',
};

const initialForm = {
  title: '',
  location: '',
  priority: 'Medium' as MaintenanceTask['priority'],
  assignedTo: '',
  description: '',
};

export default function MaintenanceContent() {
  const { data, loading, reload } = useAsyncData(() => maintenanceApi.list(), []);
  const { data: staff } = useAsyncData(() => staffApi.list(), []);
  const tasks = data ?? [];
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [addOpen, setAddOpen] = useState(false);
  const [newTask, setNewTask] = useState(initialForm);

  const filtered = tasks.filter((t) => statusFilter === 'All' || t.status === statusFilter);

  const open = tasks.filter((t) => t.status === 'Open').length;
  const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
  const done = tasks.filter((t) => t.status === 'Done').length;
  const urgent = tasks.filter(
    (t) => t.priority === 'Urgent' && t.status !== 'Done' && t.status !== 'Cancelled'
  ).length;

  const handleStatusAction = async (task: MaintenanceTask, status: MaintenanceTask['status']) => {
    try {
      await maintenanceApi.update(task.id, { status });
      toast.success(`Task marked as ${status}`);
      reload();
    } catch (err) {
      toastApiError(err);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) {
      toast.error('Work order title is required');
      return;
    }
    try {
      // Resolve the assignee by name → staff id (form collects a name).
      let assignedTo: string | null = null;
      const name = newTask.assignedTo.trim();
      if (name) {
        const match = (staff ?? []).find((s) => s.name.toLowerCase() === name.toLowerCase());
        assignedTo = match?.id ?? null;
        if (!assignedTo) {
          toast.error(`No staff member named “${name}” — leave blank or fix the name`);
          return;
        }
      }
      await maintenanceApi.create({
        title: newTask.title.trim(),
        location: newTask.location.trim() || '—',
        priority: newTask.priority,
        description: newTask.description.trim(),
        assigned_to: assignedTo,
      });
      setNewTask(initialForm);
      setAddOpen(false);
      toast.success('Work order created');
      reload();
    } catch (err) {
      toastApiError(err);
    }
  };

  if (loading) {
    return <div className="glass-panel p-10 text-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="p-4 lg:p-6 xl:p-8 max-w-screen-2xl mx-auto space-y-6">
      <Toaster position="bottom-right" theme="system" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Maintenance</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {tasks.length} work orders — schedule and track maintenance
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="btn-primary flex items-center gap-2 h-9 self-start"
        >
          <Plus size={14} />
          New Work Order
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-base p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center">
              <FolderOpen size={18} className="text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Open</p>
              <p className="text-lg font-bold text-warning font-tabular">{open}</p>
            </div>
          </div>
        </div>
        <div className="card-base p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Wrench size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">In Progress</p>
              <p className="text-lg font-bold text-primary font-tabular">{inProgress}</p>
            </div>
          </div>
        </div>
        <div className="card-base p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <CheckCircle2 size={18} className="text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Done</p>
              <p className="text-lg font-bold text-accent font-tabular">{done}</p>
            </div>
          </div>
        </div>
        <div className="card-base p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-danger/10 border border-danger/20 flex items-center justify-center">
              <AlertTriangle size={18} className="text-danger" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Urgent</p>
              <p className="text-lg font-bold text-danger font-tabular">{urgent}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {statusFilters.map((s) => {
          const count = s === 'All' ? tasks.length : tasks.filter((t) => t.status === s).length;
          return (
            <button
              key={`filter-${s}`}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {s === 'All' ? 'All' : s}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  statusFilter === s
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-background text-muted-foreground'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <div className="card-base flex flex-col items-center justify-center text-center gap-3 py-16">
          <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center">
            <ClipboardList size={22} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground">No work orders here</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Try a different filter to see more maintenance tasks.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => (
            <div
              key={task.id}
              className={`card-base p-4 ${
                task.priority === 'Urgent'
                  ? 'border-l-4 border-l-danger'
                  : task.priority === 'High'
                    ? 'border-l-4 border-l-warning'
                    : ''
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{task.title}</h3>
                    <span className={`status-badge ${priorityStyles[task.priority]}`}>
                      {task.priority}
                    </span>
                    <span className={`status-badge ${taskStatusStyles[task.status]}`}>
                      {task.status}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {task.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <User size={12} />
                      Assigned: {task.assignedTo}
                    </span>
                    <span className="flex items-center gap-1">
                      <User size={12} />
                      Reported by: {task.reportedBy}
                    </span>
                    <span className="flex items-center gap-1 font-tabular">
                      <Calendar size={12} />
                      {task.reportedAt}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {task.status === 'Open' && (
                    <button
                      onClick={() => handleStatusAction(task, 'In Progress')}
                      className="btn-success flex items-center gap-1.5 h-8 px-3"
                    >
                      <PlayCircle size={14} />
                      Start
                    </button>
                  )}
                  {task.status === 'In Progress' && (
                    <>
                      <button
                        onClick={() => handleStatusAction(task, 'Done')}
                        className="btn-primary flex items-center gap-1.5 h-8 px-3"
                      >
                        <CheckCircle2 size={14} />
                        Mark Done
                      </button>
                      <button
                        onClick={() => handleStatusAction(task, 'Cancelled')}
                        className="btn-danger flex items-center gap-1.5 h-8 px-3"
                      >
                        <XCircle size={14} />
                        Cancel
                      </button>
                    </>
                  )}
                  {(task.status === 'Done' || task.status === 'Cancelled') && (
                    <button
                      onClick={() => handleStatusAction(task, 'Open')}
                      className="btn-secondary flex items-center gap-1.5 h-8 px-3"
                    >
                      <RotateCcw size={14} />
                      Reopen
                    </button>
                  )}
                </div>
              </div>

              {task.description && (
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {task.description}
                </p>
              )}

              {task.completedAt && task.status === 'Done' && (
                <p className="mt-2 text-xs text-muted-foreground font-tabular">
                  Completed: {task.completedAt}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New Work Order Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setAddOpen(false)} />
          <div className="relative w-full max-w-md card-base p-6 fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">New Work Order</h2>
              <button
                onClick={() => setAddOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Title</label>
                <input
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="e.g. Controller drift - CTR-01"
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Location
                  </label>
                  <input
                    value={newTask.location}
                    onChange={(e) => setNewTask({ ...newTask, location: e.target.value })}
                    placeholder="e.g. Room 3"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Priority
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) =>
                      setNewTask({
                        ...newTask,
                        priority: e.target.value as MaintenanceTask['priority'],
                      })
                    }
                    className="input-field"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Assigned to
                </label>
                <input
                  list="staff-names"
                  value={newTask.assignedTo}
                  onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                  placeholder="Select or type a staff name"
                  className="input-field"
                />
                <datalist id="staff-names">
                  {(staff ?? []).map((s) => (
                    <option key={s.id} value={s.name} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Description
                </label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Describe the issue..."
                  rows={3}
                  className="input-field resize-none"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="btn-secondary flex-1 h-10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 h-10 flex items-center justify-center gap-2"
                >
                  <Plus size={14} />
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
