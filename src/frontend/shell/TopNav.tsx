import NotificationButton from "./components/NotificationButton";
import CartButton from "./components/CartButton";
import UserMenu from "./components/UserMenu";


export default function TopNav() {

  return (

    <header
      className="
        h-24
        border-b
        border-white/10
        bg-black/30
        backdrop-blur-2xl
        flex
        items-center
        justify-between
        px-10
      "
    >

      <div>

        <h2
          className="
            text-xl
            font-medium
            tracking-wide
          "
        >
          Executive Workspace
        </h2>

        <p
          className="
            text-sm
            text-white/50
          "
        >
          MARKA Business Platform
        </p>

      </div>


      <div
        className="
          flex
          items-center
          gap-5
        "
      >

        <input

          placeholder="Search MARKA..."

          className="
            w-72
            bg-white/5
            border
            border-white/10
            rounded-full
            px-6
            py-3
            outline-none
          "

        />


        <NotificationButton />


        <CartButton />


        <UserMenu />


      </div>


    </header>

  );

}
