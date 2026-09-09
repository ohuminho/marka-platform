export default function TopNav() {
  return (
    <header
      className="
        h-20
        border-b
        border-white/10
        bg-black/20
        backdrop-blur-2xl
        flex
        items-center
        justify-between
        px-8
      "
    >
      <div>
        <input
          placeholder="Search MARKA..."
          className="
            bg-white/5
            border
            border-white/10
            rounded-full
            px-5
            py-2
            outline-none
          "
        />
      </div>


      <div className="
        flex
        gap-6
        items-center
      ">
        <span>
          AOA
        </span>

        <span>
          🔔
        </span>

        <div className="
          w-10
          h-10
          rounded-full
          bg-white/10
        "/>
      </div>

    </header>
  );
}
