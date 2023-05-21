module.exports = {
  HOST: "192.168.1.228",
  PORT: "5432",
  USER: "currentsea",
  PASSWORD: "IRONman1",
  DB: "crashltcdb",
  dialect: "postgres",
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};
