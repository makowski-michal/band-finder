const mysql = require('mysql2/promise');


let connection;

async function getConnection() {
  if (!connection) {
    connection = await mysql.createConnection({
      host: "localhost",
      port: 3306,
      user: "root",
      password: "",
      database: "cs359_project",
    });
    console.log('MySQL connection established.');
  }
  return connection;
}


// New function to retrieve all bands
async function getAllBands() {
  try {
    const conn = await getConnection();
    const [rows] = await conn.query('SELECT * FROM bands');
    return rows;
  } catch (err) {
    throw new Error('DB error: ' + err.message);
  }
}

async function getBandByCredentials(username, password) {
  try {
    const conn = await getConnection();

    const selectQuery = `
      SELECT * FROM bands
      WHERE username = ? AND password = ?
    `;

    const [rows] = await conn.execute(selectQuery, [username, password]);

    return rows; // returns an array of matching bands (likely 0 or 1)
  } catch (err) {
    throw new Error('DB error: ' + err.message);
  }
}

async function updateBand(username, updates) {
  try {
    const conn = await getConnection();

    // build dynamic update query based on provided fields
    const updateFields = [];
    const updateValues = [];

    // iterate through updates object and build query
    for (const [key, value] of Object.entries(updates)) {
      // exclude fields that should not be updated directly
      if (key !== 'username' && key !== 'email' && key !== 'band_id' && key !== 'confirm_password') {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    }

    if (updateFields.length === 0) { // if no valid fields to update
      return 'no fields to update';
    }

    updateValues.push(username); // add username to values array for WHERE clause

    // dynamically build the SQL query targeting the 'bands' table
    const updateQuery = `
      UPDATE bands
      SET ${updateFields.join(', ')}
      WHERE username = ?
    `;

    const [result] = await conn.execute(updateQuery, updateValues);

    if (result.affectedRows === 0) {
      return 'No band found with that username';
    }

    return 'band information updated successfully.';
  } catch (err) {
    throw new Error('DB error: ' + err.message);
  }
}

async function deleteBand(username) {
  try {
    const conn = await getConnection();

    const deleteQuery = `
      DELETE FROM bands
      WHERE username = ?
    `;

    const [result] = await conn.execute(deleteQuery, [username]);

    if (result.affectedRows === 0) {
      return 'No band found with that username.';
    }

    return 'User deleted successfully.';
  } catch (err) {
    throw new Error('DB error: ' + err.message);
  }
}


module.exports = { getAllBands, getBandByCredentials, updateBand, deleteBand };