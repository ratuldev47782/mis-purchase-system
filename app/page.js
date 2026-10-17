export default function Home() {
  return (
    <>
      <div className="mb-6 flex h-48 items-end rounded-xl bg-cover bg-center"
        style={{ backgroundImage: 'linear-gradient(transparent,rgba(15,23,42,.85)),url(/HKD_Building_image.jpeg)' }}>
        <h1 className="p-5 !mb-0 !text-white">Dashboard</h1>
      </div>
      <div className="row mb-5">
        <a href="/new?type=application" className="btn !px-12 !py-8 text-xl">Application</a>
        <a href="/new?type=resolution" className="btn !px-12 !py-8 text-xl">Resolution</a>
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