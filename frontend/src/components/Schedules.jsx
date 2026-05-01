import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:3000";
const PAGE_SIZE = 10;
const DAYS_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function Schedules() {
  const [schedules, setSchedules] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dayFilter, setDayFilter] = useState("Monday");
  const [typeFilter, setTypeFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [checkDate, setCheckDate] = useState("2026-05-05");

  useEffect(() => {
    fetchSchedules();
  }, [checkDate]);

  useEffect(() => {
    let result = schedules;
    if (search) {
      result = result.filter(
        (s) =>
          s.CLASSNAME.toLowerCase().includes(search.toLowerCase()) ||
          s.TRAINERNAME.toLowerCase().includes(search.toLowerCase()),
      );
    }
    if (dayFilter !== "All") {
      result = result.filter((s) => s.SCHEDULEDAY === dayFilter);
    }
    if (typeFilter !== "All") {
      result = result.filter((s) => s.CLASSTYPE === typeFilter);
    }
    setFiltered(result);
    setPage(1);
  }, [dayFilter, typeFilter, search, schedules]);

  const fetchSchedules = async () => {
    try {
      const res = await axios.get(`${API}/api/schedules?date=${checkDate}`);
      const sorted = res.data.sort((a, b) => {
        const dayDiff =
          DAYS_ORDER.indexOf(a.SCHEDULEDAY) - DAYS_ORDER.indexOf(b.SCHEDULEDAY);
        if (dayDiff !== 0) return dayDiff;
        return a.STARTTIME.localeCompare(b.STARTTIME);
      });
      setSchedules(sorted);
      setFiltered(sorted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const date = e.target.value;
    setCheckDate(date);
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dayName = days[new Date(date + "T12:00:00").getDay()];
    setDayFilter(dayName);
  };

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Class Schedules</h2>
      </div>

      <div className="filters">
        <input
          className="search-input"
          placeholder="Search by class or trainer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="filter-select"
          value={dayFilter}
          onChange={(e) => setDayFilter(e.target.value)}
        >
          <option value="All">All Days</option>
          {DAYS_ORDER.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
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
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontSize: "13px", color: "#888" }}>
            Check availability for:
          </label>
          <input
            type="date"
            value={checkDate}
            onChange={handleDateChange}
            className="filter-select"
          />
        </div>
      </div>

      <div className="table-info">
        Showing {(page - 1) * PAGE_SIZE + 1}–
        {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}{" "}
        schedules
        {checkDate && (
          <span style={{ marginLeft: "8px", color: "#3b82f6" }}>
            — availability for{" "}
            {new Date(checkDate + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        )}
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Day</th>
                <th>Time</th>
                <th>Class</th>
                <th>Type</th>
                <th>Difficulty</th>
                <th>Trainer</th>
                <th>Room</th>
                <th>Capacity</th>
                <th>Booked</th>
                <th>Available</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((s) => (
                <tr key={s.SCHEDULEID}>
                  <td>{s.SCHEDULEID}</td>
                  <td>{s.SCHEDULEDAY}</td>
                  <td>{s.STARTTIME}</td>
                  <td>{s.CLASSNAME}</td>
                  <td>
                    <span
                      className={`badge badge-${s.CLASSTYPE?.toLowerCase()}`}
                    >
                      {s.CLASSTYPE}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge badge-${s.DIFFICULTY?.toLowerCase()}`}
                    >
                      {s.DIFFICULTY}
                    </span>
                  </td>
                  <td>{s.TRAINERNAME}</td>
                  <td>{s.ROOMNAME}</td>
                  <td>{s.CAPACITY}</td>
                  <td>
                    {s.TOTALBOOKED} / {s.CAPACITY}
                  </td>
                  <td>
                    {s.AVAILABLESPOTS <= 0 ? (
                      <span className="badge badge-no-show">Full</span>
                    ) : s.AVAILABLESPOTS <= 3 ? (
                      <span className="badge badge-intermediate">
                        {s.AVAILABLESPOTS} left
                      </span>
                    ) : (
                      <span className="badge badge-attended">
                        {s.AVAILABLESPOTS} left
                      </span>
                    )}
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

export default Schedules;
