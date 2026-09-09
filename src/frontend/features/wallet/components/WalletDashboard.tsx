import WalletCard from "./WalletCard";
import TransactionList from "./TransactionList";


export default function WalletDashboard() {

  return (

    <div
      className="
        space-y-8
      "
    >

      <header>
        <h1
          className="
            text-5xl
            font-semibold
          "
        >
          Wallet
        </h1>

        <p className="text-neutral-400">
          Your digital financial center
        </p>
      </header>


      <WalletCard />


      <TransactionList />

    </div>

  );
}
