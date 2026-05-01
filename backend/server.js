import "dotenv/config";
import express from "express";
import cors from "cors";
import oracledb from "oracledb";

const app = express();
app.use(cors());
app.use(express.json());

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: `${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_SERVICE}`,
  thin: true,
};

// ==========================================
// DASHBOARD
// ==========================================
app.get("/api/dashboard", async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);

    // Parse month param — default to current month
    const monthParam = req.query.month || "2026-04";
    const [year, month] = monthParam.split("-").map(Number);

    const summaryResult = await conn.execute(
      `SELECT
        (SELECT COUNT(*) FROM Member) AS TOTALMEMBERS,
        (SELECT COUNT(*) FROM Class) AS TOTALCLASSES,
        (SELECT COUNT(*) FROM Trainer) AS TOTALTRAINERS,
        (SELECT COUNT(*) FROM Booking WHERE AttendanceStatus = 'Attended') AS ATTENDEDSESSIONS,
        (SELECT COUNT(*) FROM Booking WHERE AttendanceStatus = 'Booked' AND SessionDate >= TRUNC(SYSDATE)) AS UPCOMINGBOOKINGS,
        (SELECT NVL(SUM(AmountPaid), 0) FROM Payment) AS TOTALREVENUE,
        (SELECT COUNT(*) FROM Invoice WHERE Status IN ('Unpaid', 'Partially Paid')) AS UNPAIDINVOICES
       FROM dual`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    // Revenue by tier for selected month
    const revenueByTierResult = await conn.execute(
      `WITH payment_totals AS (
     SELECT i.InvoiceID, NVL(SUM(p.AmountPaid), 0) AS collected
     FROM Invoice i
     LEFT JOIN Payment p ON i.InvoiceID = p.InvoiceID
     WHERE EXTRACT(MONTH FROM i.DueDate) = :month
       AND EXTRACT(YEAR FROM i.DueDate) = :year
     GROUP BY i.InvoiceID
   )
   SELECT
     mt.TierName AS TIER,
     COUNT(DISTINCT m.MemberID) AS MEMBERS,
     NVL(SUM(i.Amount), 0) AS TOTALBILLED,
     NVL(SUM(pt.collected), 0) AS COLLECTED,
     NVL(SUM(i.Amount), 0) - NVL(SUM(pt.collected), 0) AS OUTSTANDING,
     CASE
       WHEN NVL(SUM(i.Amount), 0) = 0 THEN 0
       ELSE ROUND(NVL(SUM(pt.collected), 0) * 100 / SUM(i.Amount), 0)
     END AS COLLECTIONRATE
   FROM MembershipTier mt
   LEFT JOIN Member m ON mt.TierID = m.TierID
   LEFT JOIN Invoice i ON m.MemberID = i.MemberID
     AND EXTRACT(MONTH FROM i.DueDate) = :month
     AND EXTRACT(YEAR FROM i.DueDate) = :year
   LEFT JOIN payment_totals pt ON i.InvoiceID = pt.InvoiceID
   GROUP BY mt.TierName, mt.TierID
   ORDER BY mt.TierID`,
      { month, year },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    // Month summary totals
    const monthTotals = revenueByTierResult.rows.reduce(
      (acc, t) => ({
        totalBilled: acc.totalBilled + Number(t.TOTALBILLED || 0),
        totalCollected: acc.totalCollected + Number(t.COLLECTED || 0),
        totalOutstanding: acc.totalOutstanding + Number(t.OUTSTANDING || 0),
      }),
      { totalBilled: 0, totalCollected: 0, totalOutstanding: 0 },
    );

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    res.json({
      summary: summaryResult.rows[0],
      revenueByTier: revenueByTierResult.rows,
      monthRevenue: monthTotals,
      periodLabel: `${monthNames[month - 1]} ${year}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// ==========================================
// MEMBERS
// ==========================================
app.get("/api/members", async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    const result = await conn.execute(
      `SELECT m.MemberID, m.FirstName, m.LastName, m.Email,
              m.DOB, m.JoinDate, m.TierID,
              t.TierName, t.MonthlyFee, t.DiscountPercent
       FROM Member m JOIN MembershipTier t ON m.TierID = t.TierID
       ORDER BY m.MemberID`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

app.post("/api/members", async (req, res) => {
  const { firstName, lastName, email, dob, tierID } = req.body;
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);

    // Get next MemberID
    const idResult = await conn.execute(
      "SELECT NVL(MAX(MemberID),0)+1 AS NEWID FROM Member",
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const newMemberID = idResult.rows[0].NEWID;

    // Insert member
    await conn.execute(
      `INSERT INTO Member (MemberID, FirstName, LastName, Email, DOB, TierID, JoinDate)
       VALUES (:1, :2, :3, :4, TO_DATE(:5,'YYYY-MM-DD'), :6, SYSDATE)`,
      [newMemberID, firstName, lastName, email, dob, tierID],
      { autoCommit: false },
    );

    // Get next InvoiceID
    const invIdResult = await conn.execute(
      "SELECT NVL(MAX(InvoiceID),0)+1 AS NEWID FROM Invoice",
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const newInvoiceID = invIdResult.rows[0].NEWID;

    // Auto create invoice for current month
    await conn.execute(
      `INSERT INTO Invoice (InvoiceID, MemberID, DueDate, Amount, Status)
       VALUES (:1, :2, LAST_DAY(SYSDATE), 0, 'Unpaid')`,
      [newInvoiceID, newMemberID],
      { autoCommit: false },
    );

    await conn.commit();
    res.json({ message: "Member added and invoice created" });
  } catch (err) {
    if (conn) await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

app.put("/api/members/:id", async (req, res) => {
  const { firstName, lastName, email, dob, tierID } = req.body;
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    await conn.execute(
      `UPDATE Member SET FirstName=:1, LastName=:2,
       Email=:3, DOB=TO_DATE(:4,'YYYY-MM-DD'), TierID=:5
       WHERE MemberID=:6`,
      [firstName, lastName, email, dob, tierID, parseInt(req.params.id)],
      { autoCommit: true },
    );
    res.json({ message: "Member updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

app.delete("/api/members/:id", async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    await conn.execute(
      "DELETE FROM Member WHERE MemberID = :1",
      [parseInt(req.params.id)],
      { autoCommit: true },
    );
    res.json({ message: "Member deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// ==========================================
// CLASSES
// ==========================================
app.get("/api/classes", async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    const classes = await conn.execute(
      `SELECT c.ClassID, c.ClassName, c.ClassType, c.Difficulty,
              t.TrainerName, r.RoomName, r.Capacity,
              c.DurationMinutes, c.MinTierRequired,
              mt.TierName AS MinTierName
       FROM Class c
       JOIN Trainer t ON c.TrainerID = t.TrainerID
       JOIN Room r ON c.RoomID = r.RoomID
       JOIN MembershipTier mt ON c.MinTierRequired = mt.TierID
       ORDER BY c.ClassID`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    const schedules = await conn.execute(
      `SELECT ClassID, ScheduleDay, StartTime
       FROM Schedule ORDER BY ClassID`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    const result = classes.rows.map((c) => ({
      ...c,
      SCHEDULES: schedules.rows
        .filter((s) => s.CLASSID === c.CLASSID)
        .map((s) => `${s.SCHEDULEDAY} ${s.STARTTIME}`),
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

app.delete("/api/classes/:id", async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    await conn.execute(
      "DELETE FROM Class WHERE ClassID = :1",
      [parseInt(req.params.id)],
      { autoCommit: true },
    );
    res.json({ message: "Class deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// ==========================================
// TRAINERS
// ==========================================
app.get("/api/trainers", async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    const result = await conn.execute(
      `SELECT t.TrainerID, t.TrainerName, t.Specialty, t.JoinDate,
              COUNT(c.ClassID) AS TotalClasses
       FROM Trainer t
       LEFT JOIN Class c ON t.TrainerID = c.TrainerID
       GROUP BY t.TrainerID, t.TrainerName, t.Specialty, t.JoinDate
       ORDER BY t.TrainerID`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

app.post("/api/trainers", async (req, res) => {
  const { trainerName, specialty, joinDate } = req.body;
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    await conn.execute(
      `INSERT INTO Trainer (TrainerID, TrainerName, Specialty, JoinDate)
       VALUES ((SELECT NVL(MAX(TrainerID),0)+1 FROM Trainer), :1, :2, TO_DATE(:3,'YYYY-MM-DD'))`,
      [trainerName, specialty, joinDate],
      { autoCommit: true },
    );
    res.json({ message: "Trainer added successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

app.put("/api/trainers/:id", async (req, res) => {
  const { trainerName, specialty, joinDate } = req.body;
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    await conn.execute(
      `UPDATE Trainer SET TrainerName=:1, Specialty=:2,
       JoinDate=TO_DATE(:3,'YYYY-MM-DD')
       WHERE TrainerID=:4`,
      [trainerName, specialty, joinDate, parseInt(req.params.id)],
      { autoCommit: true },
    );
    res.json({ message: "Trainer updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

app.delete("/api/trainers/:id", async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    await conn.execute(
      "DELETE FROM Trainer WHERE TrainerID = :1",
      [parseInt(req.params.id)],
      { autoCommit: true },
    );
    res.json({ message: "Trainer deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// ==========================================
// BOOKINGS
// ==========================================
app.get("/api/bookings", async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    const result = await conn.execute(
      `SELECT b.BookingID, b.MemberID,
              m.FirstName || ' ' || m.LastName AS MEMBERNAME,
              t.TierName, c.ClassName, c.ClassType,
              b.BookingDate, b.SessionDate, b.AttendanceStatus
       FROM Booking b
       JOIN Member m ON b.MemberID = m.MemberID
       JOIN MembershipTier t ON m.TierID = t.TierID
       JOIN Class c ON b.ClassID = c.ClassID
       ORDER BY b.SessionDate DESC`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

app.post("/api/bookings", async (req, res) => {
  const { memberID, classID, scheduledDate } = req.body;
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    await conn.execute(
      `INSERT INTO Booking (BookingID, MemberID, ClassID, SessionDate, BookingDate, AttendanceStatus)
       VALUES ((SELECT NVL(MAX(BookingID),0)+1 FROM Booking), :1, :2, TO_DATE(:3,'YYYY-MM-DD'), SYSTIMESTAMP, 'Booked')`,
      [memberID, classID, scheduledDate],
      { autoCommit: true },
    );
    res.json({ message: "Booking added successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

app.put("/api/bookings/:id", async (req, res) => {
  const { attendanceStatus } = req.body;
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    await conn.execute(
      "UPDATE Booking SET AttendanceStatus=:1 WHERE BookingID=:2",
      [attendanceStatus, parseInt(req.params.id)],
      { autoCommit: true },
    );
    res.json({ message: "Booking updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

app.delete("/api/bookings/:id", async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    await conn.execute(
      "DELETE FROM Booking WHERE BookingID = :1",
      [parseInt(req.params.id)],
      { autoCommit: true },
    );
    res.json({ message: "Booking deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// ==========================================
// INVOICES
// ==========================================
app.get("/api/invoices", async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    const result = await conn.execute(
      `SELECT i.InvoiceID, i.MemberID,
              m.FirstName || ' ' || m.LastName AS MEMBERNAME,
              t.TierName, i.Amount, i.DueDate, i.Status
       FROM Invoice i
       JOIN Member m ON i.MemberID = m.MemberID
       JOIN MembershipTier t ON m.TierID = t.TierID
       ORDER BY i.DueDate DESC, i.InvoiceID`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

app.put("/api/invoices/:id", async (req, res) => {
  const { status } = req.body;
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    await conn.execute(
      "UPDATE Invoice SET Status=:1 WHERE InvoiceID=:2",
      [status, parseInt(req.params.id)],
      { autoCommit: true },
    );
    res.json({ message: "Invoice updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// ==========================================
// SCHEDULES
// ==========================================
app.get("/api/schedules", async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);

    const checkDate = req.query.date || null;

    const result = await conn.execute(
      `SELECT s.ScheduleID, s.ClassID, c.ClassName, c.ClassType,
              c.Difficulty, t.TrainerName, r.RoomName,
              r.Capacity, s.ScheduleDay, s.StartTime,
              NVL((
                SELECT COUNT(*)
                FROM Booking b
                WHERE b.ClassID = s.ClassID
                  AND b.AttendanceStatus IN ('Booked','Attended')
                  AND b.SessionDate = TO_DATE(:checkDate, 'YYYY-MM-DD')
              ), 0) AS TotalBooked,
              r.Capacity - NVL((
                SELECT COUNT(*)
                FROM Booking b
                WHERE b.ClassID = s.ClassID
                  AND b.AttendanceStatus IN ('Booked','Attended')
                  AND b.SessionDate = TO_DATE(:checkDate, 'YYYY-MM-DD')
              ), 0) AS AvailableSpots
       FROM Schedule s
       JOIN Class c ON s.ClassID = c.ClassID
       JOIN Trainer t ON c.TrainerID = t.TrainerID
       JOIN Room r ON c.RoomID = r.RoomID
       ORDER BY s.ScheduleDay, s.StartTime`,
      { checkDate: checkDate || "2026-05-05" },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
