import "dotenv/config";
import oracledb from "oracledb";

async function test() {
  const conn = await oracledb.getConnection({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: "localhost:1521/FREEPDB1",
    thin: true,
  });

  const user = await conn.execute("SELECT USER FROM dual");
  console.log("Connected as:", user.rows[0][0]);

  const count = await conn.execute("SELECT COUNT(*) FROM Member");
  console.log("Member count:", count.rows[0][0]);

  const result = await conn.execute(
    "SELECT MEMBERID, FIRSTNAME FROM MEMBER WHERE ROWNUM <= 3",
  );
  console.log("Sample data:", result.rows);

  await conn.close();
}

test().catch(console.error);
