import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:3000";
const PAGE_SIZE = 10;

function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [tierFilter, setTierFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [editInvoice, setEditInvoice] = useState(null);
  const [editStatus, setEditStatus] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    let result = invoices;
    if (search) {
      result = result.filter((i) =>
        i.MEMBERNAME.toLowerCase().includes(search.toLowerCase()),
      );
    }
    if (statusFilter !== "All") {
      result = result.filter((i) => i.STATUS === statusFilter);
    }
    if (tierFilter !== "All") {
      result = result.filter((i) => i.TIERNAME === tierFilter);
    }
    setFiltered(result);
    setPage(1);
  }, [search, statusFilter, tierFilter, invoices]);

  const fetchInvoices = async () => {
    try {
      const res = await axios.get(`${API}/api/invoices`);
      setInvoices(res.data);
      setFiltered(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleEdit = (invoice) => {
    setEditInvoice(invoice);
    setEditStatus(invoice.STATUS);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/api/invoices/${editInvoice.INVOICEID}`, {
        status: editStatus,
      });
      setShowForm(false);
      setEditInvoice(null);
      fetchInvoices();
    } catch (err) {
      alert(err.response?.data?.error || "Error updating invoice");
    }
  };

  const totalBilled = invoices.reduce((s, i) => s + i.AMOUNT, 0);
  const totalCollected = invoices
    .filter((i) => i.STATUS === "Paid")
    .reduce((s, i) => s + i.AMOUNT, 0);
  const totalUnpaid = invoices
    .filter((i) => i.STATUS === "Unpaid")
    .reduce((s, i) => s + i.AMOUNT, 0);
  const totalPartial = invoices.filter(
    (i) => i.STATUS === "Partially Paid",
  ).length;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Invoices</h2>
      </div>

      <div className="invoice-summary">
        <div className="summary-card">
          <div className="summary-value">${totalBilled.toFixed(0)}</div>
          <div className="summary-label">Total Billed</div>
        </div>
        <div className="summary-card summary-green">
          <div className="summary-value">${totalCollected.toFixed(0)}</div>
          <div className="summary-label">Collected</div>
        </div>
        <div className="summary-card summary-red">
          <div className="summary-value">${totalUnpaid.toFixed(0)}</div>
          <div className="summary-label">Outstanding</div>
        </div>
        <div className="summary-card summary-blue">
          <div className="summary-value">
            {totalBilled > 0
              ? Math.round((totalCollected / totalBilled) * 100)
              : 0}
            %
          </div>
          <div className="summary-label">Collection Rate</div>
        </div>
        <div className="summary-card">
          <div className="summary-value">{totalPartial}</div>
          <div className="summary-label">Partial</div>
        </div>
      </div>

      {showForm && editInvoice && (
        <form className="form" onSubmit={handleSubmit}>
          <h3>Update Invoice Status</h3>
          <p style={{ fontSize: "13px", color: "#888" }}>
            {editInvoice.MEMBERNAME} — ${editInvoice.AMOUNT}
          </p>
          <select
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value)}
          >
            <option value="Paid">Paid</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Canceled">Canceled</option>
          </select>
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              Save Changes
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setShowForm(false);
                setEditInvoice(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="filters">
        <input
          className="search-input"
          placeholder="Search by member name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">All Status</option>
          <option value="Paid">Paid</option>
          <option value="Unpaid">Unpaid</option>
          <option value="Partially Paid">Partially Paid</option>
          <option value="Canceled">Canceled</option>
        </select>
        <select
          className="filter-select"
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
        >
          <option value="All">All Tiers</option>
          <option value="Bronze">Bronze</option>
          <option value="Silver">Silver</option>
          <option value="Gold">Gold</option>
        </select>
      </div>

      <div className="table-info">
        Showing {(page - 1) * PAGE_SIZE + 1}–
        {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}{" "}
        invoices
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Member</th>
                <th>Tier</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((i) => (
                <tr key={i.INVOICEID}>
                  <td>{i.INVOICEID}</td>
                  <td>{i.MEMBERNAME}</td>
                  <td>
                    <span
                      className={`badge badge-${i.TIERNAME?.toLowerCase()}`}
                    >
                      {i.TIERNAME}
                    </span>
                  </td>
                  <td>${i.AMOUNT}</td>
                  <td>{new Date(i.DUEDATE).toLocaleDateString()}</td>
                  <td>
                    <span
                      className={`badge badge-${i.STATUS?.toLowerCase().replace(" ", "-")}`}
                    >
                      {i.STATUS}
                    </span>
                  </td>
                  <td>
                    <button className="btn-edit" onClick={() => handleEdit(i)}>
                      Edit
                    </button>
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

export default Invoices;
