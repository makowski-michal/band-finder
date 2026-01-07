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


// New function to retrieve all users
async function getAllUsers() {
  try {
    const conn = await getConnection();
    const [rows] = await conn.query('SELECT * FROM users');
    return rows;
  } catch (err) {
    throw new Error('DB error: ' + err.message);
  }
}

async function getUserByCredentials(username, password) {
  try {
    const conn = await getConnection();

    const selectQuery = `
      SELECT * FROM users
      WHERE username = ? AND password = ?
    `;

    const [rows] = await conn.execute(selectQuery, [username, password]);

    return rows; // returns an array of matching users (likely 0 or 1)
  } catch (err) {
    throw new Error('DB error: ' + err.message);
  }
}


// updated function to handle partial updates of user data
async function updateUser(username, updates) {
  try {
    const conn = await getConnection();

    // build dynamic update query based on provided fields
    const updateFields = [];
    const updateValues = [];

    // iterate through updates object and build query
    for (const [key, value] of Object.entries(updates)) {
      // exclude username and email from updates as per requirements
      if (key !== 'username' && key !== 'email' && key !== 'user_id') {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    }

    if (updateFields.length === 0) { // if no valid fields to update
      return 'no fields to update';
    }

    updateValues.push(username); // add username to values array for WHERE clause

    const updateQuery = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE username = ?
    `;

    const [result] = await conn.execute(updateQuery, updateValues);

    if (result.affectedRows === 0) {
      return 'No user found with that username';
    }

    return 'user information updated successfully';
  } catch (err) {
    throw new Error('DB error: ' + err.message);
  }
}

async function deleteUser(username) {
  try {
    const conn = await getConnection();

    const deleteQuery = `
      DELETE FROM users
      WHERE username = ?
    `;

    const [result] = await conn.execute(deleteQuery, [username]);

    if (result.affectedRows === 0) {
      return 'No user found with that username.';
    }

    return 'User deleted successfully.';
  } catch (err) {
    throw new Error('DB error: ' + err.message);
  }
}


module.exports = { getAllUsers, getUserByCredentials, updateUser, deleteUser };