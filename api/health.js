export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ status: "ok", mode: "production", live: true, timestamp: new Date().toISOString() });
}
