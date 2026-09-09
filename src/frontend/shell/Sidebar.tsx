const menu = [
  "Dashboard",
  "Marketplace",
  "Wallet",
  "Orders",
  "Vendor Center",
  "Analytics",
  "Settings",
];

export default function Sidebar() {
  return (
    <aside
      className="
        w-72
        min-h-screen
        border-r
        border-white/10
        bg-black/20
        backdrop-blur-2xl
        p-8
      "
    >
      <div className="mb-12">
        <h1 className="
          text-4xl
          font-semibold
          tracking-wide
        ">
          MARKA
        </h1>

        <p className="
          text-xs
          text-neutral-400
          mt-2
        ">
          African Digital Economy
        </p>
      </div>


      <nav className="space-y-3">
        {menu.map((item) => (
          <button
            key={item}
            className="
              w-full
              text-left
              rounded-xl
              px-4
              py-3
              text-neutral-300
              hover:bg-white/10
              transition
            "
          >
            {item}
          </button>
        ))}
      </nav>

    </aside>
  );
}
