"use client";

import { useEffect } from "react";
import { useModalStore } from "@/store/modalSlice";

const Contact = () => {
  useEffect(() => {
    useModalStore.setState({ currentPage: "contact" });
  }, []);

  return (
    <>
      <div className="min-h-screen overflow-x-auto">
        <div className="relative isolate pt-14">
          {/* Contact Us Content */}
          <div className="py-24 sm:py-32 lg:pb-40">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <h1 className="text-4xl font-bold tracking-tight text-black sm:text-5xl mb-6">
                  Contact Us
                </h1>
                <p className="mt-6 text-lg leading-8 text-black">
                  Have questions or need to report an issue? Get in touch with
                  us.
                </p>

                {/* Email Section */}
                <div className="mt-12">
                  <h2 className="text-3xl font-bold text-black mb-4">
                    Email Us
                  </h2>
                  <a
                    href="mailto:hoagie@princeton.edu"
                    className="text-blue-600 hover:text-blue-700 mt-2 block text-lg"
                  >
                    hoagie@princeton.edu
                  </a>
                </div>

                {/* Bug Report Section */}
                <div className="mt-12">
                  <h2 className="text-3xl font-bold text-black mb-4">
                    Report a Bug
                  </h2>
                  <p className="mt-2 text-lg text-black">
                    Found a bug or wish to give us feedback? Let us know by
                    filling out this
                    <a
                      href="https://docs.google.com/forms/d/e/1FAIpQLSdvWEVMBK5U5GZjc-zI1VOWtannw8v5eXquPhv8JBHpN7kVSw/viewform?usp=sf_link"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 ml-1"
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
