"use client";

import { useEffect } from "react";

import Navbar from "@/components/Navbar";
import useAuthStore from "@/store/authSlice";
import { useModalStore } from "@/store/modalSlice";

const Contact = () => {
  const { checkAuthentication } = useAuthStore();

  useEffect(() => {
    checkAuthentication();
  }, [checkAuthentication]);

  useEffect(() => {
    useModalStore.setState({ currentPage: "contact" });
  });
  return (
    <>
      <Navbar />
      <div className={"min-h-screen overflow-x-auto"}>
        <div className="relative isolate pt-14">
          {/* Background Gradient Effect */}
          <div
            className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
            aria-hidden="true"
          >
            <div
              className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
              style={{
                clipPath:
                  "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
              }}
            />
          </div>

          {/* Contact Us Content */}
          <div className="py-24 sm:py-32 lg:pb-40">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center text-[var(--system-text-color)]">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Contact Us
                </h1>
                <p className="mt-6 text-lg leading-8">
                  Have questions or need to report an issue? Get in touch with
                  us.
                </p>

                {/* Email Section */}
                <div className="mt-8">
                  <h2 className="text-2xl font-semibold">Email Us</h2>
                  <a
                    href="mailto:hoagie@princeton.edu"
                    className="text-blue-600 mt-2 block"
                  >
                    hoagie@princeton.edu
                  </a>
                </div>

                {/* Bug Report Section */}
                <div className="mt-8">
                  <h2 className="text-2xl font-semibold">Report a Bug</h2>
                  <p className="mt-2">
                    Found a bug or wish to give us feedback? Let us know by
                    filling out this
                    <a
                      href="https://docs.google.com/forms/d/e/1FAIpQLSdvWEVMBK5U5GZjc-zI1VOWtannw8v5eXquPhv8JBHpN7kVSw/viewform?usp=sf_link"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 ml-1"
                    >
                      form.
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Contact;
