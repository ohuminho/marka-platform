import LuxuryButton from "@/design-system/components/buttons/LuxuryButton";
import FadeIn from "@/design-system/motion/FadeIn";

export default function MarkaHero() {
  return (
    <FadeIn>

      <section className="
        min-h-[80vh]
        flex
        flex-col
        justify-center
        items-center
        text-center
        space-y-8
      ">

        <div>

          <h1 className="
            text-7xl
            font-semibold
            tracking-tight
          ">
            MARKA
          </h1>

          <p className="
            mt-4
            text-xl
            text-neutral-300
          ">
            African born. Globally built.
          </p>

        </div>


        <p className="
          max-w-2xl
          text-neutral-400
          text-lg
        ">
          A premium digital economy platform connecting
          commerce, payments and opportunities across Africa
          and the world.
        </p>


        <div className="
          flex
          gap-4
        ">
          <LuxuryButton>
            Explore MARKA
          </LuxuryButton>

          <LuxuryButton variant="secondary">
            Become a Partner
          </LuxuryButton>
        </div>


        <div className="
          flex
          gap-12
          text-sm
          text-neutral-400
          pt-8
        ">
          <span>
            Commerce
          </span>

          <span>
            Payments
          </span>

          <span>
            Growth
          </span>
        </div>


      </section>

    </FadeIn>
  );
}
