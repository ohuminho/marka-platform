export default function UserMenu() {

  return (

    <div
      className="
        flex
        items-center
        gap-3
        rounded-full
        border
        border-white/10
        bg-white/5
        px-3
        py-2
      "
    >

      <div
        className="
          w-10
          h-10
          rounded-full
          bg-white/10
        "
      />


      <div className="hidden md:block">

        <p className="text-sm">
          Account
        </p>

        <p className="text-xs text-white/50">
          MARKA User
        </p>

      </div>


    </div>

  );

}
