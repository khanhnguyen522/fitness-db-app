import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:3000";
const PAGE_SIZE = 10;

function Trainers() {
  const [trainers, setTrainers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editTrainer, setEditTrainer] = useState(null);
  const [form, setForm] = useState({
    trainerName: "",
    specialty: "Yoga",
    joinDate: "",
  });
  const [formError, setFormError] = useState("");

  useEffect(() => {
    fetchTrainers();
  }, []);

  useEffect(() => {
    let result = trainers;
    if (search) {
      result = result.filter((t) =>
        t.TRAINERNAME.toLowerCase().includes(search.toLowerCase()),
      );
    }
    if (specialtyFilter !== "All") {
      result = result.filter((t) => t.SPECIALTY === specialtyFilter);
    }
    setFiltered(result);
    setPage(1);
  }, [search, specialtyFilter, trainers]);

  const fetchTrainers = async () => {
    try {
      const res = await axios.get(`${API}/api/trainers`);
      setTrainers(res.data);
      setFiltered(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleEdit = (trainer) => {
    setEditTrainer(trainer);
    setForm({
      trainerName: trainer.TRAINERNAME,
      specialty: trainer.SPECIALTY,
      joinDate: new Date(trainer.JOINDATE).toISOString().split("T")[0],
    });
    setShowForm(true);
    setFormError("");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this trainer?")) return;
    try {
      await axios.delete(`${API}/api/trainers/${id}`);
      fetchTrainers();
    } catch (err) {
      alert(err.response?.data?.error || "Error deleting trainer");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      if (editTrainer) {
        await axios.put(`${API}/api/trainers/${editTrainer.TRAINERID}`, form);
      } else {
        await axios.post(`${API}/api/trainers`, form);
      }
      setShowForm(false);
      setEditTrainer(null);
      setForm({ trainerName: "", specialty: "Yoga", joinDate: "" });
      fetchTrainers();
    } catch (err) {
      setFormError(err.response?.data?.error || "Error saving trainer");
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditTrainer(null);
    setForm({ trainerName: "", specialty: "Yoga", joinDate: "" });
    setFormError("");
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Trainers</h2>
        <button
          className="btn-primary"
          onClick={() => {
            setEditTrainer(null);
            setForm({ trainerName: "", specialty: "Yoga", joinDate: "" });
            setShowForm(!showForm);
          }}
        >
          {showForm && !editTrainer ? "Cancel" : "Add Trainer"}
        </button>
      </div>

      {showForm && (
        <form className="form" onSubmit={handleSubmit}>
          <h3>{editTrainer ? "Edit Trainer" : "Add New Trainer"}</h3>
          {formError && <div className="form-error">{formError}</div>}
          <input
            placeholder="Trainer Name"
            value={form.trainerName}
            onChange={(e) => setForm({ ...form, trainerName: e.target.value })}
            required
          />
          <select
            value={form.specialty}
            onChange={(e) => setForm({ ...form, specialty: e.target.value })}
          >
            <option value="Yoga">Yoga</option>
            <option value="HIIT">HIIT</option>
            <option value="Pilates">Pilates</option>
            <option value="Cycling">Cycling</option>
            <option value="Strength">Strength</option>
          </select>
          <input
            type="date"
            value={form.joinDate}
            onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
            required
          />
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editTrainer ? "Save Changes" : "Add Trainer"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="filters">
        <input
          className="search-input"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="filter-select"
          value={specialtyFilter}
          onChange={(e) => setSpecialtyFilter(e.target.value)}
        >
          <option value="All">All Specialties</option>
          <option value="Yoga">Yoga</option>
          <option value="HIIT">HIIT</option>
          <option value="Pilates">Pilates</option>
          <option value="Cycling">Cycling</option>
          <option value="Strength">Strength</option>
        </select>
      </div>

      <div className="table-info">
        Showing {(page - 1) * PAGE_SIZE + 1}–
        {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}{" "}
        trainers
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Specialty</th>
                <th>Join Date</th>
                <th>Classes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((t) => (
                <tr key={t.TRAINERID}>
                  <td>{t.TRAINERID}</td>
                  <td>{t.TRAINERNAME}</td>
                  <td>
                    <span
                      className={`badge badge-${t.SPECIALTY?.toLowerCase()}`}
                    >
                      {t.SPECIALTY}
                    </span>
                  </td>
                  <td>{new Date(t.JOINDATE).toLocaleDateString()}</td>
                  <td>{t.TOTALCLASSES}</td>
                  <td>
                    <div className="action-btns">
                      <button
                        className="btn-edit"
                        onClick={() => handleEdit(t)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(t.TRAINERID)}
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

export default Trainers;
