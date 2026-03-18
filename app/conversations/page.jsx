"use client";
import { useState, useEffect } from "react";
import { getAuthHeaders, isAuthenticated, logout } from "../../lib/api-client";
import { useRouter } from "next/navigation";

function StatusCard() {
  const [agents, setAgents] = useState({});
  const [elapsed, setElapsed] = useState("00:00:00");

  useEffect(() => {
    function fetchStatus() {
      fetch("/api/status", { headers: getAuthHeaders() })
        .then(r => r.ok ? r.json() : (r.status === 401 ? (logout(), window.location.reload()) : {}))
        .then(setAgents)
        .catch(() => {});
    }
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const activeAgent = Object.values(agents).find(a => a.status === 'working') 
    || Object.values(agents).find(a => a.status !== 'offline')
    || Object.values(agents)[0];

  useEffect(() => {
    if (!activeAgent?.lastSeen) return;
    function updateTimer() {
      const start = new Date(activeAgent.lastSeen).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - start) / 1000));
      const h = String(Math.floor(diff / 3600)).padStart(2, "0");
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
      const s = String(diff % 60).padStart(2, "0");
      setElapsed(h + ":" + m + ":" + s);
    }
    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [activeAgent?.lastSeen]);

  const agentStatus = activeAgent?.status || "idle";
  const agentName = activeAgent?.name || "System";
  const dotColor = agentStatus === "working" ? "#fd7e14" : agentStatus === "idle" ? "#238636" : "#8b949e";
  const dotClass = agentStatus === "working" ? "status-dot-pulse" : "";
  const label = agentStatus.charAt(0).toUpperCase() + agentStatus.slice(1);

  return (
    <div className="card status-card">
      <div className="status-card-row">
        <div className="status-card-left">
          <span className={"status-dot " + dotClass} style={{ background: dotColor }}></span>
          <div>
            <div className="status-label">{agentName} — {label}</div>
            {agentStatus === "working" && activeAgent?.currentTask && (
              <div className="status-task">{activeAgent.currentTask}</div>
            )}
            {(agentStatus === "offline" || !activeAgent) && (
              <div className="status-task" style={{ color: "var(--text-muted)" }}>No active agent</div>
            )}
          </div>
        </div>
        <div className="status-timer">{elapsed}</div>
      </div>
    </div>
  );
}

const AGENTS = ["all", "sawyer", "celeste", "fletcher"];

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}

function TopicTag({ topic }) {
  return (
    <span className="topic-tag">{topic}</span>
  );
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState([]);
  const [allTopics, setAllTopics] = useState([]);
  const [agentFilter, setAgentFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("");
  const [hours, setHours] = useState(168); // Default: 7 days
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchConversations();
  }, [hours, router]);

  async function fetchConversations() {
    setLoading(true);
    try {
      const res = await fetch(`/api/conversations?hours=${hours}`, { headers: getAuthHeaders() });
      if (res.status === 401) {
        logout();
        router.push('/login');
        return;
      }
      const data = await res.json();
      setConversations(data || []);
      
      // Extract all unique topics
      const topics = new Set();
      (data || []).forEach(c => {
        if (c.topics && Array.isArray(c.topics)) {
          c.topics.forEach(t => topics.add(t));
        }
      });
      setAllTopics(Array.from(topics).sort());
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    } finally {
      setLoading(false);
    }
  }

  // Filter conversations
  const filteredConversations = conversations.filter(c => {
    if (agentFilter !== "all" && c.agent !== agentFilter) return false;
    if (topicFilter) {
      const hasTopic = c.topics && c.topics.some(t => 
        t.toLowerCase().includes(topicFilter.toLowerCase())
      );
      if (!hasTopic) return false;
    }
    return true;
  });

  // Get agent color
  function getAgentColor(agent) {
    switch (agent) {
      case "sawyer": return "var(--accent)";
      case "celeste": return "var(--purple)";
      case "fletcher": return "var(--green)";
      default: return "var(--text-muted)";
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Conversations</h1>
          <p>Agent conversation summaries</p>
        </div>
      </div>

      <StatusCard />

      {/* Filters */}
      <div className="card filters-card">
        <div className="filters-row">
          <div className="filter-group">
            <label>Agent</label>
            <select 
              className="select" 
              value={agentFilter} 
              onChange={(e) => setAgentFilter(e.target.value)}
            >
              {AGENTS.map(a => (
                <option key={a} value={a}>
                  {a === "all" ? "All Agents" : a.charAt(0).toUpperCase() + a.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Topic</label>
            <input 
              className="input" 
              type="text" 
              placeholder="Search topics..." 
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Time Range</label>
            <select 
              className="select" 
              value={hours} 
              onChange={(e) => setHours(Number(e.target.value))}
            >
              <option value={24}>Last 24 hours</option>
              <option value={72}>Last 3 days</option>
              <option value={168}>Last 7 days</option>
              <option value={720}>Last 30 days</option>
            </select>
          </div>
        </div>

        {/* Topic cloud */}
        {allTopics.length > 0 && (
          <div className="topic-cloud">
            {allTopics.map(topic => (
              <button
                key={topic}
                className={`topic-btn ${topicFilter.toLowerCase() === topic.toLowerCase() ? 'active' : ''}`}
                onClick={() => setTopicFilter(topicFilter === topic ? '' : topic)}
              >
                {topic}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="results-count">
        {filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''}
        {agentFilter !== "all" && ` from ${agentFilter}`}
        {topicFilter && ` matching "${topicFilter}"`}
      </div>

      {/* Conversations list */}
      {loading ? (
        <div className="loading">Loading conversations...</div>
      ) : filteredConversations.length === 0 ? (
        <div className="card empty-card">
          <p>No conversations found</p>
        </div>
      ) : (
        <div className="conversations-list">
          {filteredConversations.map(c => (
            <div key={c.id} className="card conversation-card">
              <div className="conversation-header">
                <span 
                  className="agent-badge" 
                  style={{ background: getAgentColor(c.agent) }}
                >
                  {c.agent}
                </span>
                <span className="conversation-time">{formatDate(c.created_at)}</span>
                {c.source && <span className="conversation-source">{c.source}</span>}
              </div>
              <p className="conversation-summary">{c.summary}</p>
              {c.topics && c.topics.length > 0 && (
                <div className="conversation-topics">
                  {c.topics.map(topic => (
                    <TopicTag key={topic} topic={topic} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
