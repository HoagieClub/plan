/* eslint-disable @next/next/no-img-element */
import { useState } from "react";

import { Button as JoyButton } from "@mui/joy";
import { createPortal } from "react-dom";

import { TutorialModal } from "@/components/Modal";

import styles from "./CalendarTutorial.module.css";

interface Calendartutorial {
  isOpen: boolean;
  onClose: () => void;
}

const headers = [
  "Welcome to Calendar!",
  "Account Settings",
  "Selecting Semester",
  "Searching for Courses",
  "Search Filters",
  "Adding Courses",
  "Removing Courses",
  "Confirming Course Times",
];

const pages = [
  "This tutorial will run you through the functionality that will allow you to plan your weekly schedule for a specific semester.",
  "Click on the login dropdown in the top right of the screen to access your account settings. These settings allow you to change your name, major, minors, certificates, and class year.",
  "To select a semester, click on the desired semester on top of the calender. This will bring up any selected courses for that semester.",
  "To search for courses, click on the search bar at the top of the screen. You can search for courses by department, course number, or course title.",
  "You can filter your course search by using the search filters. These filters allow you to search for courses by distribution area, levels, semesters, and grading options.",
  "To add a course to your schedule, click on the Add button on the course card. This will add the course to your schedule.",
  "To remove a course from your schedule, click on the Remove button on the course card. This will remove the course from your schedule.",
  "In cases in which a course has multiple sections, you can confirm which section you want to add to your schedule by clicking on the section in the calendar.",
];

const photos = [
  <img
    src="/calendar_main.png"
    alt="Description"
    key={0}
    style={{ width: "80%", height: "auto" }}
  />,
  <img
    src="/calendar_profile.png"
    alt="Description"
    key={0}
    style={{ width: "65%", height: "auto" }}
  />,
  <img
    src="/semester.png"
    alt="Description"
    key={0}
    style={{ width: "65%", height: "auto" }}
  />,
  <img
    src="/calendar_search.png"
    alt="Description"
    key={0}
    style={{ width: "65%", height: "auto" }}
  />,
  <img
    src="/calendar_filters.png"
    alt="Description"
    key={0}
    style={{ width: "65%", height: "auto" }}
  />,
  <img
    src="/course_add.png"
    alt="Description"
    key={0}
    style={{ width: "65%", height: "auto" }}
  />,
  <img
    src="/course_remove.png"
    alt="Description"
    key={0}
    style={{ width: "65%", height: "auto" }}
  />,
  <img
    src="/section.png"
    alt="Description"
    key={0}
    style={{ width: "65%", height: "auto" }}
  />,
];

const Calendartutorial: React.FC<Calendartutorial> = ({ isOpen, onClose }) => {
  const [currentPage, setCurrentPage] = useState(0);

  const totalPages = pages.length;

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      // When reaching the last page, perform the "Done" action
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const modalContent = (
    <TutorialModal>
      <div className={styles.modal}>
        <div className={styles.header}>{headers[currentPage]}</div>
        <div className={styles.pageContent}>{pages[currentPage]}</div>
        <div className={styles.pagePhoto}> {photos[currentPage]} </div>
        <div className={styles.footer}>
          <JoyButton
            variant="soft"
            color="neutral"
            onClick={onClose}
            sx={{ ml: 2 }}
            size="md"
          >
            Close
          </JoyButton>
          <div className={styles.pagination}>
            <JoyButton
              variant="solid"
              color="neutral"
              onClick={handlePrev}
              sx={{ ml: 2 }}
              size="md"
              disabled={currentPage === 0}
            >
              Prev
            </JoyButton>
            <span>
              Page {currentPage + 1} of {totalPages}
            </span>
            <JoyButton
              variant="solid"
              color="neutral"
              onClick={handleNext}
              sx={{ ml: 2 }}
              size="md"
            >
              {currentPage < totalPages - 1 ? "Next" : "Done"}
            </JoyButton>
          </div>
        </div>
      </div>
    </TutorialModal>
  );

  return isOpen ? createPortal(modalContent, document.body) : null;
};

export default Calendartutorial;
