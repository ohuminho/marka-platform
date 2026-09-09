export default function WalletCard({
  balance = "0",
}: {
  balance?: string;
}) {

  return (
    <div
      className="
        rounded-3xl
        p-8
        bg-white/10
        backdrop-blur-2xl
        border
        border-white/10
      "
    >

      <p className="text-neutral-400">
        MARKA Wallet
      </p>


      <h2
        className="
          text-5xl
          font-semibold
          mt-4
        "
      >
        {balance} AOA
      </h2>


      <div
        className="
          mt-8
          flex
          gap-4
        "
      >

        <button
          className="
            px-5
            py-3
            rounded-full
            bg-white
            text-black
          "
        >
          Deposit
        </button>


        <button
          className="
            px-5
            py-3
            rounded-full
            bg-white/10
            border
            border-white/20
          "
        >
          Withdraw
        </button>

      </div>


    </div>
  );
}
