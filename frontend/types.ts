// TODO: Check all of these with Cmd + Shift + F and delete any unused ones
import { CSSProperties, ReactNode } from "react";
import "evergreen-ui";
import { UserProfile } from "@auth0/nextjs-auth0/client";

declare module "evergreen-ui" {
  interface DefaultTheme {
    title: string;
  }
}

export type HoagieUser = {
  name?: string;
  email?: string;
};

export type AuthState = {
  user?: Profile;
  isAuthenticated: boolean | null;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  checkAuthentication: () => Promise<void>;
  login: () => void;
  logout: () => void;
};

export type UserState = {
  profile: Profile;
  updateProfile: (updates: Partial<Profile>) => void;
  fetchAndUpdateProfile: (userProfile: UserProfile | null) => void;
};

export type MajorMinorType = {
  code: string;
  name: string;
};

export type Profile = {
  firstName: string;
  lastName: string;
  classYear: number;
  major: MajorMinorType;
  minors?: MajorMinorType[];
  certificates?: MajorMinorType[];
  netId: string;
  universityId: string;
  email: string;
  department: string;
  timeFormat24h: boolean;
  themeDarkMode: boolean;
};

export type ProfileProps = {
  profile: Profile;
  onClose: () => void;
  onSave: (updatedProfile: Profile) => void;
};

export type ModalProps = {
  children?: ReactNode;
  setShowPopup?: (show: boolean) => void; // TODO: Should this be optional or required?
  setTermFilter?: (term: string) => void;
  setDistributionFilter?: (distribution: string) => void;
  setLevelFilter?: (level: string[]) => void;
  setGradingFilter?: (grading: string[]) => void;
  handleCancel?: () => void;
  handleSave?: () => void;
};

export type Filter = {
  termFilter: string;
  distributionFilter: string;
  levelFilter: string[];
  gradingFilter: string[];
};

export type SearchStoreState = {
  searchResults: Course[];
  setSearchResults: (results: Course[]) => void;
  recentSearches: string[];
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  error: string | null;
  setError: (error: string | null) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
};

export type CourseProps = {
  id: number;
  course: Course;
};

export type Semester = {
  id: string;
  courses: Course[];
};

export type SemesterBinProps = {
  children?: ReactNode;
  semester: Semester;
  className?: string;
};

export type DraggableProps = {
  id: number;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export type DroppableProps = {
  id: string;
  children: ReactNode;
  className?: string;
};

export type DndState = {
  semesters: Semester[];
  addCourseToSemester: (course: Course, semesterId: string) => void;
  moveCourseWithinSemester: (
    courseID: string,
    oldIndex: number,
    newIndex: number,
  ) => void;
};

export type SearchResults = {
  courses: Course[];
};

export type MobileMenuState = {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
};

export type MenuItemProps = {
  isActive: boolean;
  children: ReactNode;
  onClick: () => void;
};

// TODO: Super sus type
export type Dictionary = {
  [key: string]: string | Dictionary;
};

// Calendar
export type CalendarEvent = {
  key: string;
  course: Course;
  section: Section;
  meeting: ClassMeeting;
  startTime: string;
  endTime: string;
  startColumnIndex: number;
  startRowIndex: number;
  endRowIndex: number;
  width?: number;
  offsetLeft?: number;
  color?: string;
  textColor?: string;

  // Defined fields
  isActive: boolean;
  needsChoice: boolean;
  isChosen: boolean;
};

// Note: types from the API, fields in snake_case.

export type AcademicTerm = {
  term_code: string;
  suffix: string;
};

export type Course = {
  // From model
  id: number;
  guid: string;
  course_id: number;
  catalog_number: number;
  title: string;
  description: string;
  drop_consent: string;
  add_consent: string;
  web_address: string;
  transcript_title: string;
  long_title: string;
  distribution_area_long: string;
  distribution_area_short: string;
  reading_writing_assignment: string;
  grading_basis: string;
  reading_list: string;
  department_code: string;
  sections: Section[];
  crosslistings: string;
};

export type Section = {
  // From model
  id: number;
  class_number: number;
  class_type: string;
  class_section: string;
  track: string;
  seat_reservations: string;
  instructor_name: string;
  capacity: number;
  status: string;
  enrollment: number;

  // Defined fields
  class_meetings: ClassMeeting[];
};

export type ClassMeeting = {
  // From model
  id: number;
  meeting_number: number;
  start_time: string;
  end_time: string;
  room: string;
  days: string;
  building_name: string;
};
