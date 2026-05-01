import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:3000";
const PAGE_SIZE = 10;

function Classes() {
  const [classes, setClasses] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [difficultyFilter, setDifficultyFilter] = useState("All");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    let result = classes;
    if (search) {
      result = result.filter(
        (c) =>
          c.CLASSNAME.toLowerCase().includes(search.toLowerCase()) ||
          c.TRAINERNAME.toLowerCase().includes(search.toLowerCase()) ||
          c.ROOMNAME.toLowerCase().includes(search.toLowerCase()),
      );
    }
    if (typeFilter !== "All") {
      result = result.filter((c) => c.CLASSTYPE === typeFilter);
    }
    if (difficultyFilter !== "All") {
      result = result.filter((c) => c.DIFFICULTY === difficultyFilter);
    }
    setFiltered(result);
    setPage(1);
  }, [search, typeFilter, difficultyFilter, classes]);

  const fetchClasses = async () => {
    try {
      const res = await axios.get(`${API}/api/classes`);
      setClasses(res.data);
      setFiltered(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this class?")) return;
    try {
      await axios.delete(`${API}/api/classes/${id}`);
      fetchClasses();
    } catch (err) {
      alert(err.response?.data?.error || "Error deleting class");
    }
  };

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Classes</h2>
      </div>

      <div className="filters">
        <input
          className="search-input"
          placeholder="Search by class, trainer or room..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="All">All Types</option>
          <option value="Yoga">Yoga</option>
          <option value="HIIT">HIIT</option>
          <option value="Pilates">Pilates</option>
          <option value="Cycling">Cycling</option>
          <option value="Strength">Strength</option>
        </select>
        <select
          className="filter-select"
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
        >
          <option value="All">All Difficulties</option>
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>
      </div>

      <div className="table-info">
        Showing {(page - 1) * PAGE_SIZE + 1}–
        {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}{" "}
        classes
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Class Name</th>
                <th>Type</th>
                <th>Difficulty</th>
                <th>Trainer</th>
                <th>Room</th>
                <th>Capacity</th>
                <th>Duration</th>
                <th>Min Tier</th>
                <th>Schedule</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((c) => (
                <tr key={c.CLASSID}>
                  <td>{c.CLASSID}</td>
                  <td>{c.CLASSNAME}</td>
                  <td>
                    <span
                      className={`badge badge-${c.CLASSTYPE?.toLowerCase()}`}
                    >
                      {c.CLASSTYPE}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge badge-${c.DIFFICULTY?.toLowerCase()}`}
                    >
                      {c.DIFFICULTY}
                    </span>
                  </td>
                  <td>{c.TRAINERNAME}</td>
                  <td>{c.ROOMNAME}</td>
                  <td>{c.CAPACITY}</td>
                  <td>{c.DURATIONMINUTES} min</td>
                  <td>
                    <span
                      className={`badge badge-${c.MINTIERNAME?.toLowerCase()}`}
                    >
                      {c.MINTIERNAME}
                    </span>
                  </td>
                  <td>
                    <div className="schedule-list">
                      {c.SCHEDULES?.map((s, i) => (
                        <span key={i} className="schedule-tag">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="action-btns">
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(c.CLASSID)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pagination">
            <button
              className="page-btn"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                className={`page-btn ${page === i + 1 ? "active" : ""}`}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button
              className="page-btn"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default Classes;
