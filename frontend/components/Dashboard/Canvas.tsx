// /*
//  * This is the beginning of the refactoring of this abomination of a file.
//  * - windsor
//  */

// "use client";

// import { useEffect, useState } from "react";

// import {
//   DndContext,
//   DragOverlay,
//   DragStartEvent,
//   DragOverEvent,
//   DragEndEvent,
//   DropAnimation,
//   KeyboardSensor,
//   MouseSensor,
//   TouchSensor,
//   UniqueIdentifier,
//   useSensors,
//   useSensor,
//   MeasuringStrategy,
//   defaultDropAnimationSideEffects,
// } from "@dnd-kit/core";
// import { createPortal } from "react-dom";

// import { Profile } from "@/types";
// import styles from "./Dashboard.module.css";
// import dashboardItemStyles from "@/components/DashboardSearchItem/DashboardSearchItem.module.css";
// import TabbedMenu from "@/components/TabbedMenu/TabbedMenu";
// import useSearchStore from "@/store/searchSlice";
// import { fetchCsrfToken } from "@/utils/csrf";
// import { cn } from "@/lib/utils";

// import { CourseCard } from "@/components/Dashboard/CourseCard";
// import { SemesterGrid } from "./SemesterGrid";
// import { SearchContainer } from "./SearchContainer";
// import { coordinateGetter as multipleContainersCoordinateGetter } from "./multipleContainersKeyboardCoordinates";
// import { generateSemesters, updateSemesters } from "./utils";

// const transitionAnimation = "width 0.2s ease-in-out, left 0.2s ease-in-out";

// let csrfToken: string;
// type Items = Record<UniqueIdentifier, UniqueIdentifier[]>;

// if (typeof window === "undefined") {
//   // Server-side or during pre-rendering/build time
//   csrfToken = "";
// } else {
//   // Client-side
//   (async () => {
//     csrfToken = await fetchCsrfToken();
//   })();
// }

// // THIS IS WHERE YOU EDIT THE DND DROP ANIMATION
// const dropAnimation: DropAnimation = {
//   duration: 200,
//   sideEffects: defaultDropAnimationSideEffects({
//     styles: {
//       active: {
//         opacity: "0.5",
//       },
//     },
//   }),
// };

// type Props = {
//   user: Profile;
//   adjustScale?: boolean;
//   columns?: number;
//   handle?: boolean;
//   scrollable?: boolean;
// };

// export const PLACEHOLDER_ID = "placeholder";
// export const SEARCH_RESULTS_ID = "Search Results";
// const defaultClassYear = new Date().getFullYear() + 1;

// export function Canvas({
//   user,
//   adjustScale = false,
//   columns = 2,
//   handle = true,
//   containerStyle,
//   coordinateGetter = multipleContainersCoordinateGetter,
//   getItemStyles = () => ({}),
//   minimal = false,
//   scrollable,
// }: Props) {
//   const classYear = user.classYear ?? defaultClassYear;

//   const semesters = generateSemesters(classYear);
//   const [items, setItems] = useState<Items>(() => ({
//     [SEARCH_RESULTS_ID]: [], // Initialize search container with no courses
//     ...semesters,
//   }));

//   // Can we just use the native Record? lol
//   type Dictionary = {
//     [key: string]: any; // TODO: Aim to replace 'any' with more specific types.
//   };

//   // Initialize a more structured dictionary if possible
//   const initialRequirements: Dictionary = {};

//   // State for academic requirements
//   const [academicPlan, setAcademicPlan] =
//     useState<Dictionary>(initialRequirements);

//   // Assuming 'user' is of type User
//   // TODO: Make this dynamic later
//   const userMajorCode = "COS-BSE";
//   const userMinors = [];
//   const userCertificates = [];

//   // Structure to hold degree requirements (not sure if this is the cleanest/best way to do this)
//   const degreeRequirements: Dictionary = { General: "" };

//   // Add major to degree requirements if it's a string
//   if (userMajorCode && typeof userMajorCode === "string") {
//     degreeRequirements[userMajorCode] = academicPlan[userMajorCode] ?? {};
//   }

//   // Probably memoize this or something?
//   // Iterate over minors and add them to degree requirements if their code is a string
//   userMinors.forEach((minor) => {
//     const minorCode = minor.code;
//     if (minorCode && typeof minorCode === "string") {
//       degreeRequirements[minorCode] = academicPlan[minorCode] ?? {};
//     }
//   });

//   // Iterate over certificates and add them to degree requirements if their code is a string
//   userCertificates.forEach((certificate) => {
//     const certificateCode = certificate.code;
//     if (certificateCode && typeof certificateCode === "string") {
//       degreeRequirements[certificateCode] = academicPlan[certificateCode] ?? {};
//     }
//   });

//   const findContainer = (id?: UniqueIdentifier) => {
//     if (id === null || id === undefined) {
//       return;
//     }
//     if (id in items) {
//       return id;
//     }
//     return Object.keys(items).find((key) => items[key].includes(id));
//   };

//   const getIndex = (id: UniqueIdentifier) => {
//     const container = findContainer(id);

//     if (!container) {
//       return -1;
//     }

//     const index = items[container].indexOf(id);

//     return index;
//   };

//   function handleRemove(
//     value: UniqueIdentifier,
//     containerId: UniqueIdentifier,
//   ) {
//     setItems((items) => {
//       const userCurrentCourses: Set<string> = new Set<string>();
//       Object.keys(items).forEach((key) => {
//         if (key !== SEARCH_RESULTS_ID) {
//           const courses = items[key];
//           courses.forEach((course) => {
//             if (course.toString() !== value.toString()) {
//               userCurrentCourses.add(course.toString());
//             }
//           });
//         }
//       });
//       const updatedCourses = {
//         ...items,
//         [SEARCH_RESULTS_ID]: searchResults
//           .filter(
//             (course) =>
//               !userCurrentCourses.has(
//                 `${course.course_id}|${course.crosslistings}`,
//               ),
//           )
//           .map((course) => `${course.course_id}|${course.crosslistings}`),
//         [containerId]: items[containerId].filter(
//           (course) => course !== value.toString(),
//         ),
//       };
//       return updatedCourses;
//     });

//     fetch(`${process.env.BACKEND}/update_courses/`, {
//       method: "POST",
//       credentials: "include",
//       headers: {
//         "Content-Type": "application/json",
//         "X-CSRFToken": csrfToken,
//         "X-NetId": user.netId,
//       },
//       body: JSON.stringify({
//         crosslistings: value.toString().split("|")[1],
//         semesterId: "Search Results",
//       }),
//     }).then((response) => {
//       response.json();
//       updateRequirements();
//     });
//   }

//   function renderSortableItemDragOverlay(id: UniqueIdentifier) {
//     return (
//       <CourseCard
//         id={id}
//         handle={handle}
//         style={getItemStyles}
//         dragOverlay // TODO: says Property 'dragOverlay' does not exist on type 'IntrinsicAttributes & CourseCardProps & RefAttributes<HTMLLIElement>'
//         containerId={findContainer(id) as UniqueIdentifier}
//         getIndex={getIndex}
//       />
//     );
//   }

//   const wrapperStyle = () => ({
//     width: courseWidth, // TODO: This was placed in layout.module.css
//   });
//   const searchWrapperStyle = () => ({
//     width: "100%",
//     overflow: "hidden", // Ensure overflow is hidden
//     whiteSpace: "nowrap", // Keep the text on a single line
//     textOverflow: "ellipsis", // Add ellipsis to text overflow
//   });

//   const updateRequirements = () => {
//     fetch(`${process.env.BACKEND}/update_requirements/`, {
//       method: "GET",
//       credentials: "include",
//       headers: {
//         "X-NetId": user.netId,
//       },
//     })
//       .then((response) => response.json())
//       .then((data) => {
//         setAcademicPlan(data);
//       });
//   };

//   const fetchCourses = async () => {
//     try {
//       const response = await fetch(
//         `${process.env.BACKEND}/fetch_courses/`,
//         {
//           method: "GET",
//           credentials: "include",
//           headers: {
//             "X-NetId": user.netId,
//           },
//         },
//       );
//       const data = await response.json();
//       console.log("DATA FROM fetchCourses()");
//       console.log(data);
//       return data;
//     } catch (error) {
//       return null; // TODO: Handle error appropriately
//     }
//   };

//   // Fetch user courses and check requirements on initial render
//   useEffect(() => {
//     fetchCourses().then((fetchedData) => {
//       if (fetchedData) {
//         setItems((prevItems) => ({
//           ...updateSemesters(prevItems, classYear, fetchedData),
//         }));
//       }
//     });
//     updateRequirements();
//   }, [classYear]);

//   const staticSearchResults = useSearchStore((state) => state.searchResults);
//   const [searchResults, setSearchResults] = useState(staticSearchResults);

//   useEffect(() => {
//     setSearchResults(staticSearchResults);
//   }, [staticSearchResults]);

//   useEffect(() => {
//     setItems((prevItems) => {
//       const userCurrentCourses: Set<string> = new Set<string>();
//       Object.keys(prevItems).forEach((key) => {
//         if (key !== SEARCH_RESULTS_ID) {
//           const courses = prevItems[key];
//           courses.forEach((course) => {
//             userCurrentCourses.add(course.toString());
//           });
//         }
//       });

//       return {
//         ...prevItems,
//         [SEARCH_RESULTS_ID]: searchResults
//           .filter(
//             (course) =>
//               !userCurrentCourses.has(
//                 `${course.course_id}|${course.crosslistings}`,
//               ),
//           )
//           .map((course) => `${course.course_id}|${course.crosslistings}`),
//       };
//     });
//   }, [searchResults]);

//   const containers = [SEARCH_RESULTS_ID, ...Object.keys(semesters)];
//   const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
//   const [clonedItems, setClonedItems] = useState<Items | null>(null);
//   const sensors = useSensors(
//     useSensor(MouseSensor),
//     useSensor(TouchSensor),
//     useSensor(KeyboardSensor, {
//       coordinateGetter,
//     }),
//   );

//   const onDragCancel = () => {
//     if (clonedItems) {
//       // Reset items to their original state in case items have been
//       // Dragged across containers
//       setItems(clonedItems);
//     }

//     setActiveId(null);
//     setActiveContainerId(null);
//     setOverContainerId(null);
//     setClonedItems(null);
//   };

//   function handleDragStart({ active }: DragStartEvent) {
//     setActiveId(active.id);
//     setClonedItems(items);
//   }

//   function handleDragOver({ active, over }: DragOverEvent) {
//     if (!over?.id || active.id in items) return;

//     const overContainer = findContainer(over.id);
//     const activeContainer = findContainer(active.id);

//     if (!overContainer || !activeContainer || activeContainer === overContainer)
//       return;

//     setItems((items) => ({
//       ...items,
//       [activeContainer]: items[activeContainer].filter(
//         (item) => item !== active.id,
//       ),
//       [overContainer]: [...items[overContainer], active.id],
//     }));
//   }

//   async function handleDragEnd({ active, over }: DragEndEvent) {
//     if (!over?.id) {
//       setActiveId(null);
//       return;
//     }

//     const overContainer = findContainer(over.id);
//     const activeContainer = findContainer(active.id);

//     if (overContainer && activeContainer !== overContainer) {
//       await fetch(`${process.env.BACKEND}/update_courses/`, {
//         method: "POST",
//         credentials: "include",
//         headers: {
//           "Content-Type": "application/json",
//           "X-NetId": user.netId,
//           "X-CSRFToken": csrfToken,
//         },
//         body: JSON.stringify({
//           crosslistings: active.id.toString().split("|")[1],
//           semesterId: overContainer,
//         }),
//       });
//       updateRequirements();
//     }

//     setActiveId(null);
//   }

//   return (
//     <div className={cn("flex flex-row items-center", styles.layoutContainer)}>
//       <DndContext
//         sensors={sensors}
//         measuring={{
//           droppable: {
//             strategy: MeasuringStrategy.Always,
//           },
//         }}
//         onDragStart={handleDragStart}
//         onDragOver={handleDragOver}
//         onDragEnd={handleDragEnd}
//         cancelDrop={() => findContainer(activeId) === SEARCH_RESULTS_ID}
//         onDragCancel={onDragCancel}
//       >
//         <div className="flex flex-row w-full">
//           {/* Left Section: Search Results */}
//           {containers.includes(SEARCH_RESULTS_ID) && (
//             <div className={cn("flex flex-col", styles.searchSection)}>
//               <SearchContainer
//                 id={SEARCH_RESULTS_ID}
//                 searchResults={staticSearchResults}
//                 items={items[SEARCH_RESULTS_ID]} // TODO: Type issues
//                 scrollable
//               >
//                 {staticSearchResults.map((course, index) => {
//                   const courseId = `${course.course_id}|${course.crosslistings}`;
//                   const isAvailable =
//                     items[SEARCH_RESULTS_ID].includes(courseId);

//                   return (
//                     <div key={courseId} className={dashboardItemStyles.card}>
//                       <div className={dashboardItemStyles.content}>
//                         <div className={dashboardItemStyles.title}>
//                           {course.title}
//                         </div>
//                         <CourseCard
//                           // A course is disabled if it's already in a semester
//                           disabled={!isAvailable}
//                           id={isAvailable ? courseId : `${courseId}|disabled`}
//                           index={index}
//                           handle={handle}
//                           style={getItemStyles}
//                           wrapperStyle={searchWrapperStyle}
//                           containerId={SEARCH_RESULTS_ID}
//                           getIndex={getIndex}
//                         />
//                       </div>
//                     </div>
//                   );
//                 })}
//               </SearchContainer>
//             </div>
//           )}

//           {/* Center Section: Semester Grid */}
//           <SemesterGrid
//             containers={containers}
//             items={items}
//             columns={columns}
//             scrollable={scrollable}
//             handle={handle}
//             getCourseCardStyles={getItemStyles}
//             wrapperStyle={wrapperStyle}
//             handleRemove={handleRemove}
//             getIndex={getIndex}
//             containerHeight="var(--container-grid-height)"
//             className="grow"
//           />

//           {/* Right Section: Requirements Panel */}
//           <div className={cn("flex flex-col", styles.requirementsSection)}>
//             <TabbedMenu
//               tabsData={academicPlan}
//               user={user}
//               csrfToken={csrfToken}
//               updateRequirements={updateRequirements}
//             />
//           </div>
//         </div>

//         {/* Drag Overlay Portal */}
//         {createPortal(
//           <DragOverlay adjustScale={adjustScale} dropAnimation={dropAnimation}>
//             {activeId && renderSortableItemDragOverlay(activeId)}
//           </DragOverlay>,
//           document.body,
//         )}
//       </DndContext>
//     </div>
//   );
// }
