export default function Home() {
  const big = { fontSize: 22, padding: '30px 50px' };
  return (
    <>
      <h1>Dashboard</h1>
      <div className="row" style={{ marginBottom: 20 }}>
        <a href="/new?type=application" className="btn" style={big}>Application</a>
        <a href="/new?type=resolution" className="btn" style={big}>Resolution</a>
      </div>
      <div className="row">
        <a className="btn sec" href="/summary">Purchase Report</a>
        <a className="btn sec" href="/ledger">IT Accessories Sheet</a>
        <a className="btn sec" href="/suppliers">Suppliers</a>
        <a className="btn sec" href="/settings">Settings</a>
      </div>
    </>
  );
}
