
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./App.css";

const API_BASE = "http://localhost:8080/api";
const AUTH_URL = `${API_BASE}/auth`;
const RESOURCE_URL = `${API_BASE}/resources`;

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "Notes",
  resourceUrl: "",
};

const EMPTY_AUTH_FORM = {
  name: "",
  email: "",
  password: "",
};

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem("token") || ""
  );
  const [currentUser, setCurrentUser] = useState(getStoredUser);
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState(EMPTY_AUTH_FORM);

  const [resources, setResources] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [authError, setAuthError] = useState("");

  const isAdmin = currentUser?.role === "ADMIN";
  const isAuthenticated = Boolean(token && currentUser);

  const authHeaders = useCallback(
    () => ({
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setToken("");
    setCurrentUser(null);
    setResources([]);
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError("");
    setMessage("");
    setAuthError("");
    setAuthMode("login");
  }, []);

  const fetchResources = useCallback(async () => {
    if (!token || !currentUser) {
      setResources([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.get(RESOURCE_URL, {
        headers: authHeaders(),
      });

      setResources(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        setAuthError("Your session has expired. Please log in again.");
      } else if (err.response?.status === 403) {
        setError("Access denied. Check your account permissions.");
      } else {
        setError(
          err.response?.data?.message ||
            "Unable to load resources. Check whether Spring Boot is running."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [token, currentUser, authHeaders, logout]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchResources();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, fetchResources]);

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      const endpoint =
        authMode === "register" ? "/register" : "/login";

      const payload =
        authMode === "register"
          ? {
              name: authForm.name.trim(),
              email: authForm.email.trim(),
              password: authForm.password,
            }
          : {
              email: authForm.email.trim(),
              password: authForm.password,
            };

      const response = await axios.post(
        `${AUTH_URL}${endpoint}`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = response.data;

      if (!data.token || !data.role || !data.email) {
        throw new Error(
          "The server response is missing token or user details."
        );
      }

      const user = {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
      };

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(user));

      setToken(data.token);
      setCurrentUser(user);
      setAuthForm(EMPTY_AUTH_FORM);
      setError("");
      setMessage(
        authMode === "register"
          ? "Your account was created successfully."
          : "Login successful. Welcome to CampusShare!"
      );
    } catch (err) {
      setAuthError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          "Authentication failed. Please try again."
      );
    } finally {
      setAuthLoading(false);
    }
  }

  function handleAuthChange(event) {
    const { name, value } = event.target;

    setAuthForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError("");
    setMessage("");
  }

  async function handleResourceSubmit(event) {
    event.preventDefault();

    if (!isAuthenticated) {
      setError("Please log in before sharing resources.");
      return;
    }

    if (editingId !== null && !isAdmin) {
      setError("Only administrators can edit resources.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const resourceData = {
      ...form,
      title: form.title.trim(),
      uploadedBy: currentUser.name || "",
    };

    try {
      if (editingId !== null) {
        console.log("Updating resource:", editingId, resourceData);

        await axios.put(
          `${RESOURCE_URL}/${editingId}`,
          resourceData,
          { headers: authHeaders() }
        );

        setMessage("Resource updated successfully.");
      } else {
        await axios.post(
          RESOURCE_URL,
          resourceData,
          { headers: authHeaders() }
        );

        setMessage("Resource added successfully.");
      }

      setForm(EMPTY_FORM);
      setEditingId(null);

      await fetchResources();
    } catch (err) {
      console.error("Resource save failed:", err);

      if (err.response?.status === 401) {
        logout();
        setAuthError("Please log in again.");
      } else if (err.response?.status === 403) {
        setError("You don't have permission to perform this operation.");
      } else {
        setError(
          err.response?.data?.message ||
            `Unable to save resource. HTTP ${err.response?.status || "network error"}.`
        );
      }
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(resource) {
    console.log("EDIT CLICKED:", resource);

    if (!isAdmin) {
      setError("Only administrators can edit resources.");
      return;
    }

    if (resource.id == null) {
      setError("This resource has no ID. Check the backend response.");
      console.error("Resource ID is missing:", resource);
      return;
    }

    setEditingId(resource.id);

    setForm({
      title: resource.title || "",
      description: resource.description || "",
      category: resource.category || "Notes",
      resourceUrl: resource.resourceUrl || "",
    });

    setError("");
    setMessage("Editing resource: " + resource.title);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleDelete(resource) {
    console.log("DELETE CLICKED:", resource);

    if (!isAdmin) {
      setError("Only administrators can delete resources.");
      return;
    }

    if (resource.id == null) {
      setError("Cannot delete this resource because its ID is missing.");
      return;
    }

    const confirmed = window.confirm(
      `Delete "${resource.title}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await axios.delete(`${RESOURCE_URL}/${resource.id}`, {
        headers: authHeaders(),
      });

      if (editingId === resource.id) {
        setForm(EMPTY_FORM);
        setEditingId(null);
      }

      setMessage("Resource deleted successfully.");
      await fetchResources();
    } catch (err) {
      console.error("Resource delete failed:", err);

      if (err.response?.status === 401) {
        logout();
        setAuthError("Please log in again.");
      } else if (err.response?.status === 403) {
        setError("Only administrators can delete resources.");
      } else {
        setError(
          err.response?.data?.message ||
            `Unable to delete resource. HTTP ${err.response?.status || "network error"}.`
        );
      }
    }
  }

  const filteredResources = useMemo(() => {
    const query = search.toLowerCase().trim();

    return resources.filter((resource) => {
      const searchableFields = [
        resource.title,
        resource.description,
        resource.category,
        resource.uploadedBy,
      ];

      const matchesSearch = searchableFields.some((value) =>
        String(value || "").toLowerCase().includes(query)
      );

      const matchesCategory =
        categoryFilter === "All" ||
        resource.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [resources, search, categoryFilter]);

  const categories = useMemo(
    () => [
      "All",
      ...new Set(
        resources.map((resource) => resource.category).filter(Boolean)
      ),
    ],
    [resources]
  );

  if (!isAuthenticated) {
    return (
      <div className="auth-page">
        <form className="auth-card" onSubmit={handleAuthSubmit}>
          <div className="auth-logo">CR</div>

          <p className="eyebrow">COLLEGE RESOURCE SHARING SYSTEM</p>
          <h1>CampusShare</h1>
          <p className="auth-subtitle">
            Your campus knowledge, all in one place.
          </p>

          <div className="auth-tabs">
            <button
              type="button"
              className={authMode === "login" ? "auth-tab active" : "auth-tab"}
              onClick={() => {
                setAuthMode("login");
                setAuthError("");
              }}
            >
              Login
            </button>

            <button
              type="button"
              className={authMode === "register" ? "auth-tab active" : "auth-tab"}
              onClick={() => {
                setAuthMode("register");
                setAuthError("");
              }}
            >
              Register
            </button>
          </div>

          <h2>
            {authMode === "login"
              ? "Welcome back"
              : "Create your student account"}
          </h2>

          {authMode === "register" && (
            <label>
              Full name
              <input
                name="name"
                type="text"
                value={authForm.name}
                onChange={handleAuthChange}
                placeholder="Enter your full name"
                autoComplete="name"
                required
              />
            </label>
          )}

          <label>
            Email address
            <input
              name="email"
              type="email"
              value={authForm.email}
              onChange={handleAuthChange}
              placeholder="you@college.edu"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password
            <input
              name="password"
              type="password"
              value={authForm.password}
              onChange={handleAuthChange}
              placeholder="Enter your password"
              autoComplete={
                authMode === "login"
                  ? "current-password"
                  : "new-password"
              }
              minLength={8}
              required
            />
          </label>

          {authError && (
            <div className="alert error" role="alert">
              {authError}
            </div>
          )}

          <button
            className="btn btn-primary auth-submit"
            type="submit"
            disabled={authLoading}
          >
            {authLoading
              ? "Please wait..."
              : authMode === "login"
                ? "Login to CampusShare"
                : "Create student account"}
          </button>

          <p className="auth-footnote">
            {authMode === "login"
              ? "New to CampusShare?"
              : "Already have an account?"}{" "}
            <button
              type="button"
              className="auth-switch"
              onClick={() => {
                setAuthMode(
                  authMode === "login" ? "register" : "login"
                );
                setAuthError("");
              }}
            >
              {authMode === "login" ? "Register here" : "Login here"}
            </button>
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">CR</div>
          <div>
            <h2>CampusShare</h2>
            <span>Resource Hub</span>
          </div>
        </div>

        <p className="nav-label">WORKSPACE</p>
        <div className="nav-item active">▦ &nbsp; Dashboard</div>
        <div className="nav-item">▤ &nbsp; Study Resources</div>
        <div className="nav-item">⇧ &nbsp; Share Resources</div>

        <div className="sidebar-note">
          <span>📚</span>
          <h3>Learn together</h3>
          <p>Share knowledge. Help your campus grow.</p>
        </div>

        <div className="sidebar-footer">
          College Resource Sharing System
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">COLLEGE RESOURCE SHARING SYSTEM</p>
            <h1>{isAdmin ? "Admin Dashboard" : "Student Dashboard"}</h1>
            <p className="subtitle">
              Discover, manage and share academic resources.
            </p>
          </div>

          <div className="topbar-actions">
            <div className="user-badge">
              <span className="user-avatar">
                {(currentUser.name || "U").charAt(0).toUpperCase()}
              </span>
              <div>
                <strong>{currentUser.name}</strong>
                <span>{currentUser.role}</span>
              </div>
            </div>

            <button type="button" className="btn btn-light" onClick={logout}>
              Logout
            </button>
          </div>
        </header>

        {error && <div className="alert error" role="alert">{error}</div>}
        {message && <div className="alert success" role="status">{message}</div>}

        <section className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon purple">▤</span>
            <p>Total resources</p>
            <h2>{resources.length}</h2>
            <span className="stat-caption">Shared study materials</span>
          </div>

          <div className="stat-card">
            <span className="stat-icon blue">▦</span>
            <p>Categories</p>
            <h2>
              {new Set(resources.map((resource) => resource.category)).size}
            </h2>
            <span className="stat-caption">Types of resources</span>
          </div>

          <div className="stat-card">
            <span className="stat-icon green">✓</span>
            <p>Visible results</p>
            <h2>{filteredResources.length}</h2>
            <span className="stat-caption">Matching your filters</span>
          </div>
        </section>

        <section className="panel form-panel" id="resource-form">
          <div className="section-heading">
            <div>
              <h2>{editingId !== null ? "Edit Resource" : "Share a Resource"}</h2>
              <p>
                {editingId !== null
                  ? `Editing resource ID: ${editingId}`
                  : "Share useful study materials with your college community."}
              </p>
            </div>

            {editingId !== null && (
              <button type="button" className="btn btn-light" onClick={resetForm}>
                Cancel edit
              </button>
            )}
          </div>

          <form onSubmit={handleResourceSubmit}>
            <div className="form-grid">
              <label>
                Resource title *
                <input
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  placeholder="e.g. Digital Electronics Notes"
                  required
                />
              </label>

              <label>
                Category *
                <select
                  name="category"
                  value={form.category}
                  onChange={handleFormChange}
                  required
                >
                  <option>Notes</option>
                  <option>PDF</option>
                  <option>Lab Records</option>
                  <option>Question Papers</option>
                  <option>Books</option>
                  <option>Presentations</option>
                  <option>Other</option>
                </select>
              </label>

              <label>
                Shared by
                <input value={currentUser.name || ""} readOnly />
              </label>

              <label>
                Resource link
                <input
                  name="resourceUrl"
                  type="url"
                  value={form.resourceUrl}
                  onChange={handleFormChange}
                  placeholder="https://example.com/resource.pdf"
                />
              </label>

              <label className="full-width">
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  placeholder="Describe the resource and topics covered..."
                  rows="3"
                />
              </label>
            </div>

            <div className="form-actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : editingId !== null
                    ? "Save Changes"
                    : "+ Add Resource"}
              </button>
            </div>
          </form>
        </section>

        <section className="panel resources-panel">
          <div className="section-heading">
            <div>
              <h2>Shared Resources</h2>
              <p>Browse and manage academic materials.</p>
            </div>
            <span className="count-badge">{filteredResources.length} items</span>
          </div>

          <div className="filters">
            <input
              className="search-input"
              type="search"
              placeholder="Search by title, description or category..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === "All" ? "All categories" : category}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="btn btn-light"
              onClick={fetchResources}
              disabled={loading}
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {loading ? (
            <div className="empty-state"><p>Loading resources...</p></div>
          ) : filteredResources.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <h3>
                {resources.length === 0
                  ? "No resources shared yet"
                  : "No matching resources"}
              </h3>
              <p>
                {resources.length === 0
                  ? "Add your first resource using the form above."
                  : "Try another search term or category."}
              </p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>RESOURCE</th>
                    <th>CATEGORY</th>
                    <th>SHARED BY</th>
                    <th>LINK</th>
                    {isAdmin && <th>ACTIONS</th>}
                  </tr>
                </thead>

                <tbody>
                  {filteredResources.map((resource) => (
                    <tr key={resource.id}>
                      <td>
                        <strong>{resource.title}</strong>
                        <span className="description">
                          {resource.description || "No description"}
                        </span>
                      </td>

                      <td>
                        <span className="category-badge">{resource.category}</span>
                      </td>

                      <td>{resource.uploadedBy || "Not specified"}</td>

                      <td>
                        {resource.resourceUrl ? (
                          <a
                            href={resource.resourceUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open resource ↗
                          </a>
                        ) : (
                          <span className="muted">No link</span>
                        )}
                      </td>

                      {isAdmin && (
                        <td>
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="btn btn-edit"
                              onClick={() => handleEdit(resource)}
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className="btn btn-delete"
                              onClick={() => handleDelete(resource)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="page-footer">
          CampusShare · React, Spring Boot and MySQL
        </footer>
      </main>
    </div>
  );
}

export default App;
