"use client";

import { useAuth } from "@/frontend/providers/auth/AuthProvider";
import { NavigationConfig } from "./navigation.config";


export default function Sidebar() {


  const { user } = useAuth();


  const role =
    user?.role || "CUSTOMER";


  const sections =
    NavigationConfig[
      role as keyof typeof NavigationConfig
    ];



  return (

    <aside

      className="
        w-80
        min-h-screen
        border-r
        border-white/10
        bg-black/30
        backdrop-blur-2xl
        px-8
        py-10
      "

    >


      <div className="mb-14">


        <h1

          className="
            text-4xl
            font-semibold
            tracking-[0.15em]
          "

        >

          MARKA

        </h1>


        <p

          className="
            mt-3
            text-sm
            text-white/50
          "

        >

          African Digital Economy

        </p>


      </div>




      <nav className="space-y-10">


        {sections.map((section) => (

          <div

            key={section.group}

          >

            <p

              className="
                text-xs
                uppercase
                tracking-widest
                text-white/40
                mb-4
              "

            >

              {section.group}

            </p>



            <div className="space-y-2">


              {section.items.map((item) => (

                <button

                  key={item.route}

                  className="
                    w-full
                    text-left
                    rounded-2xl
                    px-5
                    py-4
                    border
                    border-transparent
                    hover:border-white/10
                    hover:bg-white/10
                    transition-all
                  "

                >

                  <p
                    className="
                      text-sm
                      font-medium
                    "
                  >

                    {item.title}

                  </p>


                  <p

                    className="
                      text-xs
                      text-white/40
                      mt-1
                    "

                  >

                    {item.description}

                  </p>


                </button>

              ))}


            </div>


          </div>

        ))}


      </nav>


    </aside>

  );

}
