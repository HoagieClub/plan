import { useState } from "react";
import { Button as JoyButton } from "@mui/joy";
import { createPortal } from "react-dom";
import { TutorialModal } from "@/components/Modal";

interface DashboardTutorial {
  isOpen: boolean;
  onClose: () => void;
}

const headers = [
  "Welcome to Dashboard!",
  "Account Settings",
  "Searching for Courses",
  "Course Details",
  "Search Filters",
  "Drag and Drop",
  "Confirming Requirement Fullfillment",
  "Requirement Information",
  "Search for Requirements",
  "Mark as Satisfied",
];

const pages = [
  "This tutorial will run you through the functionality that will allow you to plan your 4-year academic schedule.",
  "Click on the login dropdown in the top right of the screen to access your account settings. These settings allow you to change your name, major, minors, certificates, and class year.",
  "To search for courses, click on the search bar at the top of the screen. You can search for courses by department, course number, or course title.",
  "You can view course details including course description, reviews, and further information by clicking on the course card. This will display the course details.",
  "You can filter your course search by using the search filters. These filters allow you to search for courses by distribution area, levels, semesters, and grading options.",
  "To add a course to your schedule, drag and drop the course card into the desired semester.",
  "If a course can fulfill multiple requirements you can confirm which requirement you want it to fulfill by clicking on the course under the respective requirement. This will confirm the requirement fulfillment.",
  "To view further information about a requirement, click on the requirement name. This will display the requirement details.",
  "To search for courses that fulfill a specific requirment, click on the Search Courses button in the requirement details pop up. This will autofill search results for courses that fulfill the requirement.",
  "To mark a requirement as satisfied, click on Mark Satisfied button within the requirment detail pop up. This will mark the requirement as satisfied.",
];

const photos = [
  <img
    src="/welcome.png"
    alt="Description"
    key={0}
    className="w-4/5 h-auto"
  />,
  <img
    src="/settings.png"
    alt="Description"
    key={1}
    className="w-2/3 h-auto"
  />,
  <img
    src="/search.png"
    alt="Description"
    key={2}
    className="w-2/3 h-auto"
  />,
  <img
    src="/course_detail.png"
    alt="Description"
    key={3}
    className="w-2/3 h-auto"
  />,
  <img
    src="/filters.png"
    alt="Description"
    key={4}
    className="w-2/3 h-auto"
  />,
  <img
    src="/drag.png"
    alt="Description"
    key={5}
    className="w-2/3 h-auto"
  />,
  <img
    src="/requirement_confirm.png"
    alt="Description"
    key={6}
    className="w-2/3 h-auto"
  />,
  <img
    src="/requirement_detail.png"
    alt="Description"
    key={7}
    className="w-2/3 h-auto"
  />,
  <img
    src="/requirement_search.png"
    alt="Description"
    key={8}
    className="w-2/3 h-auto"
  />,
  <img
    src="/satisfy.png"
    alt="Description"
    key={9}
    className="w-2/3 h-auto"
  />,
];

const DashboardTutorial: React.FC<DashboardTutorial> = ({
  isOpen,
  onClose,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = pages.length;

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    } else {
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
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white rounded-lg shadow-lg p-5 w-[70%] h-[70%] md:w-[80%] md:h-[80%] sm:w-[90%] sm:h-[90%] lg:w-[50%] lg:h-[70%] overflow-auto transform -translate-x-1/2 -translate-y-1/2">
        <div className="font-bold text-2xl text-gray-800 mb-4">
          {headers[currentPage]}
        </div>
        <div className="text-base text-gray-800 min-h-[90px] mb-4">
          {pages[currentPage]}
        </div>
        <div className="flex justify-center items-center mb-5">
          {photos[currentPage]}
        </div>
        <div className="flex justify-between mt-auto">
          <JoyButton
            variant="soft"
            color="neutral"
            onClick={onClose}
            className="ml-2"
            size="md"
          >
            Close
          </JoyButton>
          <div className="flex items-center flex-shrink-0">
            <JoyButton
              variant="solid"
              color="neutral"
              onClick={handlePrev}
              className="ml-2"
              size="md"
              disabled={currentPage === 0}
            >
              Prev
            </JoyButton>
            <span className="mx-5 ml-5 text-sm text-gray-600">
              Page {currentPage + 1} of {totalPages}
            </span>
            <JoyButton
              variant="solid"
              color="neutral"
              onClick={handleNext}
              className="ml-2"
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

export default DashboardTutorial;
