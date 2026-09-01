import React, { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Plus, Search, X, CheckCircle2, Pencil, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { apiEndpoints, uniqueAcademicYearsByName } from "@/api/apiEndpoints.js";
import "./SectionManagementPage.css";

const PAGE_SIZE = 5;
const EMPTY = {
  boardId: "",
  academicYearId: "",
  academicLevelId: "",
  groupId: "",
  groupProgramId: "",
  programId: "",
  roomId: "",
  classTeacherId: "",
  board: "",
  academicYear: "",
  group: "",
  program: "",
  academicLevel: "",
  name: "",
  room: "",
  teacher: "",
  strength: "",
  status: "",
  rowVersion: null,
};
const EMPTY_ROOM = {
  roomCode: "",
  roomName: "",
  capacity: "",
  roomType: "",
  building: "",
  floor: "",
  isActive: "",
};
const EMPTY_FILTERS = { board: "", academicYear: "", academicLevel: "" };
const EMPTY_ROOM_FILTERS = { building: "", floor: "", roomType: "" };
const ROOM_TYPES = [
  "Classroom",
  "Laboratory",
  "Computer Lab",
  "Seminar Hall",
  "Library",
  "Examination Hall",
  "Staff Room",
  "Other",
];
const label = (room) => room.roomCode;
const normalizeSectionName = (name) => name.trim().replace(/\s+/g, " ");
const normalizeRoomCode = (code) =>
  String(code ?? "")
    .trim()
    .replace(/\s+/g, " ");
const normalizedValue = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();
const roomCodesMatch = (first, second) =>
  normalizeRoomCode(first).toLowerCase() === normalizeRoomCode(second).toLowerCase();
const firstNonEmpty = (...values) =>
  values.find((value) => value != null && String(value).trim() !== "") ?? "";
const collectionFrom = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.result)) return data.result;
  return [];
};
const activeValue = (value) => {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value == null) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "active";
};
const normalizeActive = (item) => activeValue(firstNonEmpty(item?.isActive, item?.status));
const isActiveRecord = (item) => normalizeActive(item);
const positiveId = (value) => Number.isInteger(Number(value)) && Number(value) > 0;
const groupProgramKey = (groupId, programId) => `${String(groupId)}:${String(programId)}`;
const dedupeBy = (items, keyOf) => [
  ...new Map(items.filter((item) => keyOf(item)).map((item) => [keyOf(item), item])).values(),
];
const normalizeBoard = (item) => ({
  id: String(item.boardId ?? item.id ?? ""),
  name: firstNonEmpty(item.boardName, item.name),
  code: firstNonEmpty(item.boardCode, item.code),
  isActive: normalizeActive(item),
});
const normalizeAcademicYear = (item) => ({
  id: String(item.academicYearId ?? item.id ?? ""),
  boardId: item.boardId == null ? null : String(item.boardId),
  name: firstNonEmpty(item.academicYearName, item.yearName, item.name),
  startDate: item.startDate ?? "",
  endDate: item.endDate ?? "",
  isActive: normalizeActive(item),
});
const normalizeAcademicLevel = (item) => ({
  id: String(item.academicLevelId ?? item.id ?? ""),
  name: firstNonEmpty(item.levelName, item.academicLevelName, item.name),
});
const normalizeGroup = (item) => ({
  id: String(item.groupId ?? item.id ?? ""),
  boardId: item.boardId == null ? null : String(item.boardId),
  name: firstNonEmpty(item.groupName, item.name),
  code: firstNonEmpty(item.groupCode, item.code),
  isActive: normalizeActive(item),
});
const normalizeProgram = (item, fallbackGroupId = "") => ({
  groupProgramId: String(item.groupProgramId ?? item.groupProgrammeId ?? ""),
  programId: String(item.programId ?? item.programmeId ?? item.id ?? ""),
  groupId: String(item.groupId ?? fallbackGroupId ?? ""),
  name: firstNonEmpty(item.programName, item.programmeName, item.name),
  code: firstNonEmpty(item.programCode, item.code),
  isActive: normalizeActive(item),
});
const normalizeRoom = (room) => ({
  ...room,
  id: room.roomId ?? room.id,
  roomCode: firstNonEmpty(room.roomCode, room.roomNumber),
  roomName: firstNonEmpty(room.roomName),
  capacity: room.capacity ?? 0,
  roomType: room.roomType ?? "",
  building: room.building ?? room.buildingName ?? "",
  floor: String(room.floor ?? ""),
  isActive: normalizeActive(room),
  rowVersion: room.rowVersion,
});
const normalizeTeacher = (item) => ({
  id: String(
    item.staffId ?? item.classTeacherId ?? item.teacherId ?? item.facultyId ?? item.id ?? "",
  ),
  employeeId: String(item.employeeId ?? item.employeeCode ?? ""),
  name: firstNonEmpty(
    item.fullName,
    item.staffName,
    item.teacherName,
    `${item.firstName || ""} ${item.lastName || ""}`.trim(),
  ),
  staffType: firstNonEmpty(item.staffType, item.facultyType, "Teaching"),
  isActive: normalizeActive({ isActive: item.isActive ?? item.status ?? true }),
});
const normalizeSection = (section) => {
  const active = normalizeActive(section);
  return {
    ...section,
    id: section.sectionId ?? section.id,
    boardId: section.boardId ?? "",
    board: firstNonEmpty(section.boardName, section.board),
    boardCode: firstNonEmpty(section.boardCode, section.code),
    academicYearId: section.academicYearId ?? "",
    academicYear: firstNonEmpty(section.academicYearName, section.academicYear, section.yearName),
    academicLevelId: section.academicLevelId ?? section.yearOfStudyId ?? "",
    academicLevel: firstNonEmpty(
      section.academicLevelName,
      section.levelName,
      section.academicLevel,
      section.yearOfStudy,
    ),
    groupId: section.groupId ?? "",
    group: firstNonEmpty(section.groupName, section.group),
    groupProgramId: section.groupProgramId ?? section.groupProgrammeId ?? "",
    programId: section.programId ?? section.programmeId ?? "",
    program: firstNonEmpty(
      section.programName,
      section.programmeName,
      section.programme,
      section.program,
    ),
    roomId: section.roomId ?? "",
    room: firstNonEmpty(section.roomName, section.roomNumber, section.roomCode, section.room),
    roomNumber: firstNonEmpty(section.roomNumber, section.roomCode),
    classTeacherId:
      section.classTeacherId ?? section.teacherId ?? section.facultyId ?? section.inchargeId ?? "",
    teacher: firstNonEmpty(
      section.classTeacherName,
      section.inchargeName,
      section.facultyName,
      section.teacherName,
      section.teacher,
      section.incharge,
    ),
    name: firstNonEmpty(section.sectionName, section.name),
    strength: section.maximumStrength ?? section.strength ?? section.capacity ?? "",
    status: active ? "Active" : "Inactive",
    createdAt: section.createdAt ?? "",
    updatedAt: section.updatedAt ?? "",
    rowVersion: section.rowVersion,
  };
};

export const pageConfig = {
  title: "Section Management",
  subtitle: "Manage academic sections, classrooms and Incharge assignments.",
  breadcrumb: ["Academics"],
};

export default function SectionManagementPage() {
  const [activeTab, setActiveTab] = useState("sections");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sections, setSections] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [boardsList, setBoardsList] = useState([]);
  const [academicYearsList, setAcademicYearsList] = useState([]);
  const [groupsList, setGroupsList] = useState([]);
  const [programsList, setProgramsList] = useState([]);
  const [groupsCatalog, setGroupsCatalog] = useState([]);
  const [programsCatalog, setProgramsCatalog] = useState([]);
  const [academicLevelsList, setAcademicLevelsList] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [savingSection, setSavingSection] = useState(false);
  const [savingRoom, setSavingRoom] = useState(false);
  const [deletingSectionId, setDeletingSectionId] = useState(null);
  const [deletingRoomId, setDeletingRoomId] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const [roomModal, setRoomModal] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [mode, setMode] = useState("add");
  const [form, setForm] = useState(() => ({ ...EMPTY }));
  const [roomForm, setRoomForm] = useState(() => ({ ...EMPTY_ROOM }));
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [roomMode, setRoomMode] = useState("add");
  const [roomModalFromSection, setRoomModalFromSection] = useState(false);
  const [roomSearch, setRoomSearch] = useState("");
  const [roomFilters, setRoomFilters] = useState(EMPTY_ROOM_FILTERS);
  const [roomPage, setRoomPage] = useState(1);
  const [toast, setToast] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [roomModalError, setRoomModalError] = useState(null);
  const [viewSection, setViewSection] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState(null);
  const toastTimer = useRef(null);
  const groupsRequest = useRef(0);
  const programsRequest = useRef(0);
  const viewRequestRef = useRef(0);
  const mountedRef = useRef(true);

  const say = (message) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, 3000);
  };
  const loadRooms = async () => {
    setLoadingRooms(true);
    try {
      const response = await apiClient.get(apiEndpoints.rooms.getAll);
      setRooms(
        collectionFrom(response.data)
          .map(normalizeRoom)
          .filter((room) => room.id),
      );
    } catch (error) {
      say(getApiErrorMessage(error));
    } finally {
      setLoadingRooms(false);
    }
  };
  const loadSections = async (params) => {
    const response = await apiClient.get(apiEndpoints.sections.list, { params });
    const nextSections = collectionFrom(response.data)
      .map(normalizeSection)
      .filter((section) => section.id);
    setSections(nextSections);
    return nextSections;
  };
  const loadGroups = async (boardId, selectedGroupId = "") => {
    const requestId = ++groupsRequest.current;
    if (!positiveId(boardId)) {
      setGroupsList([]);
      setProgramsList([]);
      return null;
    }
    try {
      const response = await apiClient.get(apiEndpoints.groups.getAll, { params: { boardId } });
      const groups = collectionFrom(response.data)
        .filter(isActiveRecord)
        .map(normalizeGroup)
        .filter((item) => item.id && item.name);
      if (requestId !== groupsRequest.current) return null;
      setGroupsList(groups);
      setGroupsCatalog((current) => dedupeBy([...current, ...groups], (item) => item.id));
      const selectedGroup = groups.find((item) => String(item.id) === String(selectedGroupId));
      if (selectedGroup) {
        const programsRequestId = ++programsRequest.current;
        const programsResponse = await apiClient.get(
          apiEndpoints.groups.programs(selectedGroup.id),
        );
        if (requestId !== groupsRequest.current || programsRequestId !== programsRequest.current)
          return null;
        const programs = collectionFrom(programsResponse.data)
          .filter(isActiveRecord)
          .map((item) => normalizeProgram(item, selectedGroup.id))
          .filter((item) => item.programId && item.name);
        setProgramsList(programs);
        setProgramsCatalog((current) =>
          dedupeBy(
            [...current, ...programs],
            (item) => `${item.groupId}:${item.groupProgramId || item.programId}`,
          ),
        );
      } else {
        setProgramsList([]);
      }
      return groups;
    } catch (error) {
      if (requestId !== groupsRequest.current) return null;
      setGroupsList([]);
      say(getApiErrorMessage(error));
      return null;
    }
  };
  const loadPrograms = async (groupId) => {
    const requestId = ++programsRequest.current;
    if (!positiveId(groupId)) {
      setProgramsList([]);
      return null;
    }
    try {
      const response = await apiClient.get(apiEndpoints.groups.programs(groupId));
      const programs = collectionFrom(response.data)
        .filter(isActiveRecord)
        .map((item) => normalizeProgram(item, groupId))
        .filter((item) => item.programId && item.name);
      if (requestId !== programsRequest.current) return null;
      setProgramsList(programs);
      setProgramsCatalog((current) =>
        dedupeBy(
          [...current, ...programs],
          (item) => `${item.groupId}:${item.groupProgramId || item.programId}`,
        ),
      );
      return programs;
    } catch (error) {
      if (requestId !== programsRequest.current) return null;
      setProgramsList([]);
      say(getApiErrorMessage(error));
      return null;
    }
  };
  useEffect(() => {
    let active = true;
    const loadInitialData = async () => {
      setLoading(true);
      const results = await Promise.allSettled([
        apiClient.get(apiEndpoints.boards.list),
        apiClient.get(apiEndpoints.academicYears.list),
        apiClient.get(apiEndpoints.boards.academicLevels),
        apiClient
          .get("/api/v1/staff", {
            params: { StaffType: "Teaching", Status: "Active", PageSize: 100 },
          })
          .catch(() =>
            apiClient.get("/api/v1/staff/dropdown", { params: { staffType: "Teaching" } }),
          ),
        apiClient.get(apiEndpoints.sections.list),
      ]);
      if (!active) return;
      const [boardsResult, yearsResult, levelsResult, staffResult, sectionsResult] = results;
      if (boardsResult.status === "fulfilled")
        setBoardsList(
          collectionFrom(boardsResult.value.data)
            .map(normalizeBoard)
            .filter((item) => item.isActive && item.id && item.name),
        );
      if (yearsResult.status === "fulfilled")
        setAcademicYearsList(
          collectionFrom(yearsResult.value.data)
            .map(normalizeAcademicYear)
            .filter((item) => item.isActive && item.id && item.name),
        );
      if (levelsResult.status === "fulfilled")
        setAcademicLevelsList(
          collectionFrom(levelsResult.value.data)
            .map(normalizeAcademicLevel)
            .filter((item) => item.id && item.name),
        );
      if (staffResult.status === "fulfilled") {
        const staffItems = collectionFrom(staffResult.value.data);

        const teachers = dedupeBy(
          staffItems.map(normalizeTeacher).filter((item) => {
            const type = normalizedValue(item.staffType).replace(/\s+/g, " ");
            return (
              item.isActive && ["teaching", "teaching staff"].includes(type) && item.id && item.name
            );
          }),
          (item) => item.employeeId || item.id,
        );

        setTeachersList(teachers);
      }
      if (sectionsResult.status === "fulfilled")
        setSections(
          collectionFrom(sectionsResult.value.data)
            .map(normalizeSection)
            .filter((section) => section.id),
        );
      if (results.some((result) => result.status === "rejected"))
        say("Some Section Management data could not be loaded.");
      setLoading(false);
    };
    loadInitialData();
    loadRooms();
    return () => {
      active = false;
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!sections.length) return undefined;
    let active = true;
    const hydrateCatalogs = async () => {
      const boardIds = [
        ...new Set(
          sections
            .filter((section) => !section.group && positiveId(section.boardId))
            .map((section) => String(section.boardId)),
        ),
      ];
      const groupResults = await Promise.allSettled(
        boardIds.map((boardId) =>
          apiClient.get(apiEndpoints.groups.getAll, { params: { boardId } }),
        ),
      );
      if (!active || !mountedRef.current) return;
      const hydratedGroups = groupResults
        .flatMap((result) =>
          result.status === "fulfilled"
            ? collectionFrom(result.value.data).filter(isActiveRecord).map(normalizeGroup)
            : [],
        )
        .filter((item) => item.id && item.name);
      if (hydratedGroups.length)
        setGroupsCatalog((current) => dedupeBy([...current, ...hydratedGroups], (item) => item.id));

      const groupIds = [
        ...new Set(
          sections
            .filter((section) => !section.program && positiveId(section.groupId))
            .map((section) => String(section.groupId)),
        ),
      ];
      const programResults = await Promise.allSettled(
        groupIds.map((groupId) =>
          apiClient
            .get(apiEndpoints.groups.programs(groupId))
            .then((response) => ({ response, groupId })),
        ),
      );
      if (!active || !mountedRef.current) return;
      const hydratedPrograms = programResults
        .flatMap((result) =>
          result.status === "fulfilled"
            ? collectionFrom(result.value.response.data)
                .filter(isActiveRecord)
                .map((item) => normalizeProgram(item, result.value.groupId))
            : [],
        )
        .filter((item) => item.programId && item.name);
      if (hydratedPrograms.length)
        setProgramsCatalog((current) =>
          dedupeBy(
            [...current, ...hydratedPrograms],
            (item) => `${item.groupId}:${item.groupProgramId || item.programId}`,
          ),
        );
    };
    hydrateCatalogs();
    return () => {
      active = false;
    };
  }, [sections]);

  const updateFilter = (key, value) => {
    setFilters((previous) =>
      key === "board"
        ? { ...previous, board: value, academicYear: "" }
        : { ...previous, [key]: value },
    );
  };

  const change = async (key, value) => {
    setModalError(null);
    if (key === "board") {
      const selectedBoard = boardsList.find((item) => item.name === value);
      groupsRequest.current += 1;
      programsRequest.current += 1;
      setGroupsList([]);
      setProgramsList([]);
      setForm((previous) => ({
        ...previous,
        board: value,
        boardId: selectedBoard?.id ?? "",
        academicYear: "",
        academicYearId: "",
        group: "",
        groupId: "",
        program: "",
        programId: "",
        groupProgramId: "",
      }));
      if (selectedBoard) await loadGroups(selectedBoard.id);
      return;
    }
    if (key === "academicYear") {
      const selectedYear = academicYearsList.find(
        (item) =>
          String(item.id) === String(value) &&
          (item.boardId == null || String(item.boardId) === String(form.boardId)),
      );
      setForm((previous) => ({
        ...previous,
        academicYear: selectedYear?.name ?? "",
        academicYearId: selectedYear?.id ?? "",
      }));
      return;
    }
    if (key === "academicLevel") {
      const selectedLevel = academicLevelsList.find((item) => item.name === value);
      setForm((previous) => ({
        ...previous,
        academicLevel: value,
        academicLevelId: selectedLevel?.id ?? "",
      }));
      return;
    }
    if (key === "group") {
      const selectedGroup = groupsList.find((item) => String(item.id) === String(value));
      programsRequest.current += 1;
      setProgramsList([]);
      setForm((previous) => ({
        ...previous,
        group: selectedGroup?.name ?? "",
        groupId: selectedGroup?.id ?? "",
        program: "",
        programId: "",
        groupProgramId: "",
      }));
      if (selectedGroup) await loadPrograms(selectedGroup.id);
      return;
    }
    if (key === "program") {
      const selectedProgram = programsList.find(
        (item) =>
          String(item.groupId) === String(form.groupId) &&
          String(item.groupProgramId || item.programId) === String(value),
      );
      setForm((previous) => ({
        ...previous,
        program: selectedProgram?.name ?? "",
        programId: selectedProgram?.programId ?? "",
        groupProgramId: selectedProgram?.groupProgramId ?? "",
      }));
      return;
    }
    if (key === "room") {
      const selectedRoom = rooms.find((room) => String(room.id) === String(value));
      const roomCapacity = Number(selectedRoom?.capacity);
      setForm((previous) => ({
        ...previous,
        room: selectedRoom?.roomCode ?? "",
        roomId: selectedRoom?.id ?? "",
        strength:
          selectedRoom && Number.isFinite(roomCapacity) && roomCapacity > 0
            ? String(selectedRoom.capacity)
            : "",
      }));
      return;
    }
    if (key === "teacher") {
      const selectedTeacher = teachersList.find((item) => String(item.id) === String(value));
      setForm((previous) => ({
        ...previous,
        teacher: selectedTeacher?.name ?? "",
        classTeacherId: selectedTeacher?.id ?? "",
      }));
      return;
    }
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const changeRoom = (key, value) => {
    setRoomModalError(null);
    setRoomForm((current) => ({ ...current, [key]: value }));
  };

  const boardsById = useMemo(
    () => new Map(boardsList.map((item) => [String(item.id), item])),
    [boardsList],
  );
  const yearsById = useMemo(
    () => new Map(academicYearsList.map((item) => [String(item.id), item])),
    [academicYearsList],
  );
  const levelsById = useMemo(
    () => new Map(academicLevelsList.map((item) => [String(item.id), item])),
    [academicLevelsList],
  );
  const groupsById = useMemo(
    () => new Map([...groupsCatalog, ...groupsList].map((item) => [String(item.id), item])),
    [groupsCatalog, groupsList],
  );
  const roomsById = useMemo(() => new Map(rooms.map((item) => [String(item.id), item])), [rooms]);
  const teachersById = useMemo(
    () => new Map(teachersList.map((item) => [String(item.id), item])),
    [teachersList],
  );
  const programsByGroupProgramId = useMemo(
    () =>
      new Map(
        programsCatalog
          .filter((item) => item.groupProgramId)
          .map((item) => [String(item.groupProgramId), item]),
      ),
    [programsCatalog],
  );
  const programsByGroupAndProgramId = useMemo(
    () =>
      new Map(programsCatalog.map((item) => [groupProgramKey(item.groupId, item.programId), item])),
    [programsCatalog],
  );
  const programsById = useMemo(
    () => new Map(programsCatalog.map((item) => [String(item.programId), item])),
    [programsCatalog],
  );

  const resolveSection = (section) => {
    const resolvedProgram =
      programsByGroupProgramId.get(String(section.groupProgramId)) ??
      programsByGroupAndProgramId.get(groupProgramKey(section.groupId, section.programId)) ??
      programsById.get(String(section.programId));
    const room = roomsById.get(String(section.roomId));
    const roomName = firstNonEmpty(section.room, room?.roomName, room?.roomCode) || "—";
    const roomCode = firstNonEmpty(room?.roomCode, section.roomNumber, section.room) || "—";
    return {
      boardCode:
        firstNonEmpty(section.boardCode, boardsById.get(String(section.boardId))?.code) || "—",
      boardName: firstNonEmpty(section.board, boardsById.get(String(section.boardId))?.name) || "—",
      academicYearName:
        firstNonEmpty(section.academicYear, yearsById.get(String(section.academicYearId))?.name) ||
        "—",
      academicLevelName:
        firstNonEmpty(
          section.academicLevel,
          levelsById.get(String(section.academicLevelId))?.name,
        ) || "—",
      groupName: firstNonEmpty(section.group, groupsById.get(String(section.groupId))?.name) || "—",
      programName: firstNonEmpty(section.program, resolvedProgram?.name) || "—",
      roomName,
      roomCode,
      roomDisplay:
        roomName !== roomCode && roomCode !== "—" ? `${roomName} (${roomCode})` : roomName,
      teacherName:
        firstNonEmpty(section.teacher, teachersById.get(String(section.classTeacherId))?.name) ||
        "—",
    };
  };

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sections.filter((section) => {
      const display = resolveSection(section);
      if (filters.board && display.boardName !== filters.board) return false;
      if (filters.academicYear && display.academicYearName !== filters.academicYear) return false;
      if (filters.academicLevel && display.academicLevelName !== filters.academicLevel)
        return false;
      return (
        !query ||
        [
          section.name,
          display.boardCode,
          display.boardName,
          display.academicYearName,
          display.groupName,
          display.programName,
          display.academicLevelName,
          display.roomDisplay,
          display.teacherName,
          section.status,
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(query),
        )
      );
    });
  }, [
    sections,
    filters,
    search,
    boardsById,
    yearsById,
    levelsById,
    groupsById,
    roomsById,
    teachersById,
    programsByGroupProgramId,
    programsByGroupAndProgramId,
    programsById,
  ]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const sectionRangeStart = rows.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const sectionRangeEnd = Math.min(page * PAGE_SIZE, rows.length);
  const roomRows = useMemo(() => {
    const query = roomSearch.trim().toLowerCase();
    return rooms.filter((room) => {
      if (roomFilters.building && room.building !== roomFilters.building) return false;
      if (roomFilters.floor && String(room.floor) !== roomFilters.floor) return false;
      if (roomFilters.roomType && room.roomType !== roomFilters.roomType) return false;
      return (
        !query ||
        [
          room.roomCode,
          room.roomName,
          room.building,
          room.floor,
          room.roomType,
          room.isActive ? "Active" : "Inactive",
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(query),
        )
      );
    });
  }, [rooms, roomSearch, roomFilters]);

  const roomPages = Math.max(1, Math.ceil(roomRows.length / PAGE_SIZE));
  const shownRooms = roomRows.slice((roomPage - 1) * PAGE_SIZE, roomPage * PAGE_SIZE);
  const roomRangeStart = roomRows.length ? (roomPage - 1) * PAGE_SIZE + 1 : 0;
  const roomRangeEnd = Math.min(roomPage * PAGE_SIZE, roomRows.length);
  const sectionSearchPlaceholder = "Search by section,group,pr...";
  const roomSearchPlaceholder = "Search by block,status,name...";
  const roomBuildings = useMemo(
    () => [...new Set(rooms.map((room) => room.building).filter(Boolean))],
    [rooms],
  );
  const roomFloors = useMemo(
    () => [...new Set(rooms.map((room) => String(room.floor)).filter(Boolean))],
    [rooms],
  );
  const roomFilterTypes = useMemo(
    () => [...new Set(rooms.map((room) => room.roomType).filter(Boolean))],
    [rooms],
  );
  const roomTypes = ROOM_TYPES;
  const boardOptions = useMemo(() => boardsList.map((item) => item.name), [boardsList]);
  const formAcademicYears = useMemo(
    () =>
      academicYearsList.filter(
        (item) =>
          item.boardId == null || !form.boardId || String(item.boardId) === String(form.boardId),
      ),
    [academicYearsList, form.boardId],
  );
  const filterAcademicYears = useMemo(() => {
    const board = boardsList.find((item) => item.name === filters.board);
    return academicYearsList.filter(
      (item) => item.boardId == null || !board || String(item.boardId) === String(board.id),
    );
  }, [academicYearsList, boardsList, filters.board]);
  const academicYearOptions = useMemo(
    () => formAcademicYears.map((item) => ({ value: item.id, label: item.name })),
    [formAcademicYears],
  );
  const academicYearFilterOptions = useMemo(
    () =>
      uniqueAcademicYearsByName(
        filterAcademicYears.map((item) => item.name),
        (item) => item,
      ),
    [filterAcademicYears],
  );
  const groupOptions = useMemo(
    () => groupsList.map((item) => ({ value: item.id, label: item.name })),
    [groupsList],
  );
  const programOptions = useMemo(
    () =>
      programsList.map((item) => ({
        value: item.groupProgramId || item.programId,
        label: item.name,
      })),
    [programsList],
  );
  const academicLevelOptions = useMemo(
    () => academicLevelsList.map((item) => item.name),
    [academicLevelsList],
  );

  useEffect(() => setPage(1), [filters, search]);
  useEffect(() => setRoomPage(1), [roomFilters, roomSearch]);
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);
  useEffect(() => {
    if (roomPage > roomPages) setRoomPage(roomPages);
  }, [roomPage, roomPages]);
  useEffect(() => {
    if (!modal && !roomModal) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [modal, roomModal]);
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const selected = selectedSectionId;
  const edit = mode === "edit";
  const preview = mode === "preview";
  const readOnly = mode === "preview";

  // 1. Available Rooms: Show Active rooms of type "Classroom" that are NOT assigned to another active section
  const availableRooms = useMemo(() => {
    const assignedRoomIds = new Set(
      sections
        .filter(
          (section) =>
            section.id !== selectedSectionId &&
            section.status === "Active" &&
            positiveId(section.roomId),
        )
        .map((section) => String(section.roomId)),
    );

    const assignedRoomCodes = new Set(
      sections
        .filter(
          (section) =>
            section.id !== selectedSectionId && section.status === "Active" && section.room,
        )
        .map((section) => normalizeRoomCode(resolveSection(section).roomCode).toLowerCase()),
    );

    const options = rooms
      .filter((room) => room.isActive && room.roomType === "Classroom")
      .filter((room) => {
        const roomIdStr = String(room.id);
        const roomCodeNormalized = normalizeRoomCode(room.roomCode).toLowerCase();
        return !assignedRoomIds.has(roomIdStr) && !assignedRoomCodes.has(roomCodeNormalized);
      })
      .map((room) => ({ value: String(room.id), label: label(room) }));

    if (form.roomId && !options.some((option) => option.value === String(form.roomId))) {
      const currentRoomObj = rooms.find((r) => String(r.id) === String(form.roomId));
      const roomLabel = currentRoomObj ? label(currentRoomObj) : form.room || "Current Room";
      return [{ value: String(form.roomId), label: roomLabel }, ...options];
    }

    return options;
  }, [rooms, sections, selectedSectionId, form.roomId, form.room]);

  // 2. Available Teachers: Show Active teaching staff NOT assigned as Incharge to another active section
  const availableTeachers = useMemo(() => {
    const assignedTeacherIds = new Set(
      sections
        .filter(
          (section) =>
            section.id !== selectedSectionId &&
            section.status === "Active" &&
            positiveId(section.classTeacherId),
        )
        .map((section) => String(section.classTeacherId)),
    );

    const options = teachersList
      .filter((teacher) => teacher.isActive && !assignedTeacherIds.has(String(teacher.id)))
      .map((teacher) => ({
        value: String(teacher.id),
        label: teacher.employeeId ? `${teacher.name} (${teacher.employeeId})` : teacher.name,
      }));

    if (
      form.classTeacherId &&
      !options.some((option) => option.value === String(form.classTeacherId))
    ) {
      const currentTeacherObj = teachersList.find(
        (t) => String(t.id) === String(form.classTeacherId),
      );
      const teacherLabel = currentTeacherObj
        ? currentTeacherObj.employeeId
          ? `${currentTeacherObj.name} (${currentTeacherObj.employeeId})`
          : currentTeacherObj.name
        : form.teacher || "Current Incharge";
      return [{ value: String(form.classTeacherId), label: teacherLabel }, ...options];
    }

    return options;
  }, [teachersList, sections, selectedSectionId, form.classTeacherId, form.teacher]);

  const close = () => {
    setModal(false);
    setSelectedSectionId(null);
    setMode("add");
    setForm({ ...EMPTY });
    setModalError(null);
    setViewSection(null);
    setViewError(null);
    setViewLoading(false);
    viewRequestRef.current += 1;
  };
  const openAdd = () => {
    setSelectedSectionId(null);
    setMode("add");
    setForm({ ...EMPTY });
    setModalError(null);
    setModal(true);
  };
  const prepareEditForm = async (section) => {
    const display = resolveSection(section);
    const next = {
      ...section,
      ...display,
      board: display.boardName,
      academicYear: display.academicYearName,
      academicLevel: display.academicLevelName,
      group: display.groupName,
      program: display.programName,
      room: display.roomCode,
      teacher: display.teacherName,
      strength: String(section.strength ?? ""),
    };
    setForm(next);
    await loadGroups(section.boardId, section.groupId);
  };
  const openRow = async (section, isPreview = false) => {
    setSelectedSectionId(section.id);
    setMode(isPreview ? "preview" : "edit");
    setModalError(null);
    setModal(true);
    if (!isPreview) {
      await prepareEditForm(section);
      return;
    }
    const requestId = ++viewRequestRef.current;
    setViewSection(null);
    setViewError(null);
    setViewLoading(true);
    try {
      const response = await apiClient.get(apiEndpoints.sections.getById(section.id));
      const payload = response.data?.data ?? response.data?.result ?? response.data;
      if (!payload || typeof payload !== "object" || Array.isArray(payload))
        throw new Error("Invalid Section detail response.");
      const detail = normalizeSection(payload);
      if (!positiveId(detail.id))
        throw new Error("Section detail response did not contain a valid Section ID.");
      const hydrationRequests = [];
      if (!detail.group && positiveId(detail.boardId)) {
        hydrationRequests.push(
          apiClient
            .get(apiEndpoints.groups.getAll, { params: { boardId: detail.boardId } })
            .then((result) => ({
              type: "groups",
              items: collectionFrom(result.data).filter(isActiveRecord).map(normalizeGroup),
            })),
        );
      }
      if (!detail.program && positiveId(detail.groupId)) {
        hydrationRequests.push(
          apiClient.get(apiEndpoints.groups.programs(detail.groupId)).then((result) => ({
            type: "programs",
            items: collectionFrom(result.data)
              .filter(isActiveRecord)
              .map((item) => normalizeProgram(item, detail.groupId)),
          })),
        );
      }
      if (hydrationRequests.length) {
        const hydrationResults = await Promise.allSettled(hydrationRequests);
        if (requestId !== viewRequestRef.current) return;
        hydrationResults.forEach((result) => {
          if (result.status !== "fulfilled") return;
          if (result.value.type === "groups")
            setGroupsCatalog((current) =>
              dedupeBy([...current, ...result.value.items], (item) => item.id),
            );
          if (result.value.type === "programs")
            setProgramsCatalog((current) =>
              dedupeBy(
                [...current, ...result.value.items],
                (item) => `${item.groupId}:${item.groupProgramId || item.programId}`,
              ),
            );
        });
      }
      if (requestId !== viewRequestRef.current) return;
      setViewSection(detail);
    } catch (error) {
      if (requestId !== viewRequestRef.current) return;
      setViewError(error.response ? getApiErrorMessage(error) : error.message);
    } finally {
      if (requestId === viewRequestRef.current) setViewLoading(false);
    }
  };
  const enterEditMode = async () => {
    if (!viewSection) return;
    setModalError(null);
    await prepareEditForm(viewSection);
    setMode("edit");
  };
  const openRoomModal = (fromSection = false) => {
    setRoomForm({ ...EMPTY_ROOM });
    setSelectedRoomId(null);
    setRoomMode("add");
    setRoomModalFromSection(fromSection);
    setRoomModalError(null);
    setRoomModal(true);
  };
  const closeRoomModal = () => {
    setRoomModal(false);
    setSelectedRoomId(null);
    setRoomMode("add");
    setRoomModalFromSection(false);
    setRoomForm({ ...EMPTY_ROOM });
    setRoomModalError(null);
  };
  const openRoom = (room, preview = false) => {
    setSelectedRoomId(room.id);
    setRoomMode(preview ? "preview" : "edit");
    setRoomModalFromSection(false);
    setRoomForm({ ...room, capacity: String(room.capacity ?? "") });
    setRoomModalError(null);
    setRoomModal(true);
  };
  const deleteSection = async (section) => {
    if (!section?.id || deletingSectionId !== null) return;
    if (!window.confirm(`Are you sure you want to delete section "${section.name}"?`)) return;
    setDeletingSectionId(section.id);
    try {
      await apiClient.delete(apiEndpoints.sections.delete(section.id));
      await loadSections();
      say(`Section "${section.name}" deleted successfully!`);
    } catch (error) {
      say(getApiErrorMessage(error));
    } finally {
      setDeletingSectionId(null);
    }
  };
  const deleteRoom = async (room) => {
    if (!room?.id || deletingRoomId !== null) return;
    if (!window.confirm(`Are you sure you want to delete room "${room.roomCode}"?`)) return;
    setDeletingRoomId(room.id);
    try {
      await apiClient.delete(`/api/v1/rooms/${room.id}`);
      await loadRooms();
      say(`Room "${room.roomCode}" deleted successfully!`);
    } catch (error) {
      say(getApiErrorMessage(error));
    } finally {
      setDeletingRoomId(null);
    }
  };
  const save = async (event) => {
    event.preventDefault();
    if (savingSection) return;
    if (!["Active", "Inactive"].includes(form.status))
      return setModalError("Please select a valid Section status.");
    const required = [
      "board",
      "academicYear",
      "group",
      "program",
      "academicLevel",
      "name",
      "room",
      "teacher",
      "strength",
      "status",
    ];
    if (required.some((key) => !String(form[key] || "").trim()))
      return setModalError("Please complete all required fields.");
    const normalizedName = normalizeSectionName(form.name);
    if (!/[A-Za-z0-9]/.test(normalizedName))
      return setModalError("Section name must contain a meaningful character.");
    if (!/^[A-Za-z0-9 -]+$/.test(normalizedName))
      return setModalError("Section name may contain only letters, numbers, spaces, and hyphens.");
    const strength = Number(form.strength);
    if (!Number.isInteger(strength) || strength < 1 || strength > 150)
      return setModalError("Capacity must be between 1 and 150.");
    const selectedBoard = boardsList.find((item) => String(item.id) === String(form.boardId));
    const selectedYear = academicYearsList.find(
      (item) => String(item.id) === String(form.academicYearId),
    );
    const selectedLevel = academicLevelsList.find(
      (item) => String(item.id) === String(form.academicLevelId),
    );
    const selectedGroup = groupsList.find((item) => String(item.id) === String(form.groupId));
    const selectedProgram = programsList.find(
      (item) =>
        String(item.groupId) === String(form.groupId) &&
        String(item.programId) === String(form.programId) &&
        (!form.groupProgramId || String(item.groupProgramId) === String(form.groupProgramId)),
    );
    const selectedRoom = rooms.find((room) => String(room.id) === String(form.roomId));
    const selectedTeacher = teachersList.find(
      (teacher) => String(teacher.id) === String(form.classTeacherId),
    );
    if (
      ![
        form.boardId,
        form.academicYearId,
        form.academicLevelId,
        form.groupId,
        form.programId,
        form.roomId,
        form.classTeacherId,
      ].every(positiveId)
    )
      return setModalError("Please select valid current values from each dropdown.");
    if (
      !selectedBoard ||
      !selectedYear ||
      !selectedLevel ||
      !selectedGroup ||
      !selectedProgram ||
      !selectedRoom ||
      !selectedTeacher
    )
      return setModalError("Please select valid current values from each dropdown.");
    if (selectedYear.boardId != null && String(selectedYear.boardId) !== String(selectedBoard.id))
      return setModalError("The selected Academic Year does not belong to the selected Board.");
    if (selectedGroup.boardId != null && String(selectedGroup.boardId) !== String(selectedBoard.id))
      return setModalError("The selected Group does not belong to the selected Board.");
    if (String(selectedProgram.groupId) !== String(selectedGroup.id))
      return setModalError("The selected Program does not belong to the selected Group.");
    if (
      form.groupProgramId &&
      String(selectedProgram.groupProgramId) !== String(form.groupProgramId)
    )
      return setModalError("The selected Group–Program association is no longer valid.");
    if (form.status === "Active") {
      if (!selectedRoom.isActive) return setModalError("Please select an active classroom room.");
      if (selectedRoom.roomType !== "Classroom")
        return setModalError("Only Classroom rooms can be assigned to a section.");
      if (strength > Number(selectedRoom.capacity))
        return setModalError(
          `Section capacity cannot exceed room capacity (${selectedRoom.capacity}).`,
        );
      if (!selectedTeacher.isActive)
        return setModalError("Please select an available active Incharge.");
    }
    const other = (section) => section.id !== selectedSectionId;
    const conflictingSection = sections.find(
      (section) =>
        other(section) &&
        section.status === "Active" &&
        positiveId(section.classTeacherId) &&
        String(section.classTeacherId) === String(form.classTeacherId),
    );
    if (conflictingSection)
      return setModalError(
        `The selected Incharge is already assigned to active section "${conflictingSection.name}".`,
      );
    if (
      sections.some(
        (section) =>
          other(section) &&
          String(section.boardId) === String(form.boardId) &&
          String(section.academicYearId) === String(form.academicYearId) &&
          String(section.academicLevelId) === String(form.academicLevelId) &&
          String(section.groupId) === String(form.groupId) &&
          String(section.programId) === String(form.programId) &&
          normalizeSectionName(section.name).toLowerCase() === normalizedName.toLowerCase(),
      )
    )
      return setModalError("Section name already exists for the selected academic configuration.");
    if (
      form.status === "Active" &&
      sections.some(
        (section) =>
          other(section) &&
          section.status === "Active" &&
          ((positiveId(section.roomId) && String(section.roomId) === String(form.roomId)) ||
            (!positiveId(section.roomId) &&
              roomCodesMatch(resolveSection(section).roomCode, selectedRoom.roomCode))),
      )
    )
      return setModalError("Selected room is already assigned to another active section.");
    const isEditing = Boolean(selectedSectionId);
    const payload = {
      boardId: Number(form.boardId),
      board: selectedBoard.name,
      academicYearId: Number(form.academicYearId),
      academicLevelId: Number(form.academicLevelId),
      academicLevel: selectedLevel.name,
      yearOfStudy: selectedLevel.name,
      groupId: Number(form.groupId),
      group: selectedGroup.name,
      ...(form.groupProgramId ? { groupProgramId: Number(form.groupProgramId) } : {}),
      programId: Number(form.programId),
      programme: selectedProgram.name,
      program: selectedProgram.name,
      sectionName: normalizedName,
      roomId: Number(form.roomId),
      roomNumber: selectedRoom.roomCode,
      classTeacherId: Number(form.classTeacherId),
      maximumStrength: strength,
      capacity: strength,
      isActive: form.status === "Active",
      ...(form.rowVersion != null ? { rowVersion: form.rowVersion } : {}),
    };
    setSavingSection(true);
    try {
      if (isEditing) await apiClient.put(apiEndpoints.sections.update(selectedSectionId), payload);
      else await apiClient.post(apiEndpoints.sections.create, payload);
      let refreshFailed = false;
      try {
        await loadSections();
      } catch {
        refreshFailed = true;
      }
      close();
      setSearch("");
      setPage(1);
      say(
        refreshFailed
          ? `Section "${normalizedName}" was saved, but the refreshed list could not be loaded.`
          : isEditing
            ? `Section "${normalizedName}" updated successfully!`
            : `Section "${normalizedName}" added successfully!`,
      );
    } catch (error) {
      setModalError(getApiErrorMessage(error));
    } finally {
      setSavingSection(false);
    }
  };
  const saveRoom = async (event) => {
    event.preventDefault();
    if (savingRoom) return;
    if (roomForm.isActive !== true && roomForm.isActive !== false)
      return setRoomModalError("Please select a valid Room status.");
    const room = {
      id: selectedRoomId,
      roomCode: normalizeRoomCode(roomForm.roomCode),
      roomName: roomForm.roomName.trim(),
      capacity: Number(roomForm.capacity),
      roomType: roomForm.roomType.trim(),
      building: roomForm.building.trim(),
      floor: roomForm.floor.trim(),
      isActive: roomForm.isActive,
    };
    if (
      !room.roomCode ||
      !room.roomName ||
      !room.roomType ||
      !room.building ||
      !room.floor ||
      !String(roomForm.capacity).trim()
    )
      return setRoomModalError("Please complete all required room fields.");
    if (!Number.isInteger(room.capacity) || room.capacity <= 0)
      return setRoomModalError("Room capacity must be a positive whole number.");
    if (!ROOM_TYPES.includes(room.roomType))
      return setRoomModalError("Please select a valid room type.");
    if (
      rooms.some(
        (item) => item.id !== selectedRoomId && roomCodesMatch(item.roomCode, room.roomCode),
      )
    )
      return setRoomModalError("A room with this code already exists.");
    const currentRoom = rooms.find((item) => item.id === selectedRoomId);
    const assignedSections = sections.filter(
      (section) =>
        section.status === "Active" &&
        ((positiveId(section.roomId) && String(section.roomId) === String(currentRoom?.id)) ||
          (!positiveId(section.roomId) &&
            roomCodesMatch(
              resolveSection(section).roomCode,
              currentRoom?.roomCode ?? room.roomCode,
            ))),
    );
    if (assignedSections.length && !roomCodesMatch(room.roomCode, currentRoom.roomCode))
      return setRoomModalError(
        "Room code cannot be changed because this room is assigned to an active section.",
      );
    if (
      assignedSections.length &&
      currentRoom.roomType === "Classroom" &&
      room.roomType !== "Classroom"
    )
      return setRoomModalError(
        "Room type cannot be changed because this room is assigned to an active section.",
      );
    const maxAssignedStrength = Math.max(
      0,
      ...assignedSections.map((section) => Number(section.strength) || 0),
    );
    if (room.capacity < maxAssignedStrength)
      return setRoomModalError(
        "Room capacity cannot be reduced below the strength of an assigned active section.",
      );
    if (currentRoom?.isActive && !room.isActive && assignedSections.length)
      return setRoomModalError(
        "Cannot deactivate this room because it is assigned to an active section.",
      );

    const isEditingRoom = Boolean(selectedRoomId);
    const payload = {
      roomCode: room.roomCode,
      roomName: room.roomName,
      roomNumber: room.roomCode,
      capacity: room.capacity,
      roomType: room.roomType,
      building: room.building,
      buildingName: room.building,
      floor: room.floor,
      isActive: room.isActive,
      ...(roomForm.rowVersion != null ? { rowVersion: roomForm.rowVersion } : {}),
    };
    setSavingRoom(true);
    try {
      let response;
      if (isEditingRoom) response = await apiClient.put(`/api/v1/rooms/${selectedRoomId}`, payload);
      else response = await apiClient.post(apiEndpoints.rooms.getAll, payload);
      const responsePayload = response.data?.data ?? response.data?.result ?? response.data;
      const createdRoom =
        responsePayload && typeof responsePayload === "object" && !Array.isArray(responsePayload)
          ? normalizeRoom(responsePayload)
          : null;
      let refreshFailed = false;
      let nextRooms = rooms;
      try {
        const refreshedRooms = await apiClient.get(apiEndpoints.rooms.getAll);
        nextRooms = collectionFrom(refreshedRooms.data)
          .map(normalizeRoom)
          .filter((item) => item.id);
        setRooms(nextRooms);
      } catch {
        refreshFailed = true;
      }
      if (
        !isEditingRoom &&
        roomModalFromSection &&
        room.isActive &&
        room.roomType === "Classroom"
      ) {
        const selectedCreatedRoom = positiveId(createdRoom?.id)
          ? createdRoom
          : nextRooms.find((item) => roomCodesMatch(item.roomCode, room.roomCode));
        if (selectedCreatedRoom)
          setForm((current) => ({
            ...current,
            roomId: selectedCreatedRoom.id,
            room: selectedCreatedRoom.roomCode,
            strength: String(selectedCreatedRoom.capacity ?? room.capacity ?? ""),
          }));
        else refreshFailed = true;
      }
      closeRoomModal();
      setRoomSearch("");
      setRoomPage(1);
      say(
        refreshFailed
          ? `Room "${room.roomCode}" was saved, but the refreshed room list could not be loaded.`
          : isEditingRoom
            ? `Room "${room.roomCode}" ${room.isActive ? "updated" : "deactivated"} successfully!`
            : `Room "${room.roomCode}" added successfully!`,
      );
    } catch (error) {
      setRoomModalError(getApiErrorMessage(error));
    } finally {
      setSavingRoom(false);
    }
  };
  return (
    <DashboardLayout
      title={activeTab === "sections" ? pageConfig.title : "Room Management"}
      subtitle={
        activeTab === "sections"
          ? pageConfig.subtitle
          : "Manage classrooms, capacities and room allocation setup."
      }
      breadcrumb={pageConfig.breadcrumb}
    >
      <div className="cms-sec-container">
        <div className="cms-room-tabs" role="tablist" aria-label="Management modules">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "sections"}
            className={`cms-room-tab ${activeTab === "sections" ? "cms-room-tab-active" : ""}`}
            onClick={() => setActiveTab("sections")}
          >
            Section Management
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "rooms"}
            className={`cms-room-tab ${activeTab === "rooms" ? "cms-room-tab-active" : ""}`}
            onClick={() => setActiveTab("rooms")}
          >
            Room Management
          </button>
        </div>
        {activeTab === "sections" && (
          <>
            <div className="cms-card">
              <div className="cms-toolbar cms-sec-toolbar">
                <div className="cms-search cms-sec-search">
                  <Search size={16} />
                  <input
                    type="search"
                    placeholder={sectionSearchPlaceholder}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
                <div className="cms-sec-toolbar-filters">
                  <ConstrainedFilterField
                    label="Board"
                    value={filters.board}
                    onChange={(value) => updateFilter("board", value)}
                    options={boardOptions}
                  />
                  <FilterField
                    label="Academic Year"
                    value={filters.academicYear}
                    onChange={(value) => updateFilter("academicYear", value)}
                    options={academicYearFilterOptions}
                    showLabel={false}
                  />
                  <ConstrainedFilterField
                    label="Academic Level"
                    value={filters.academicLevel}
                    onChange={(value) => updateFilter("academicLevel", value)}
                    options={academicLevelOptions}
                  />
                </div>
                <div className="cms-sec-toolbar-spacer" />
                <button
                  type="button"
                  className="cms-btn cms-btn-primary cms-sec-compact-btn"
                  onClick={openAdd}
                >
                  <Plus size={16} />
                  Add Section
                </button>
              </div>
              <div className="cms-table-wrap cms-sec-table-wrap">
                <table className="cms-table cms-sec-table cms-section-table">
                  <thead>
                    <tr>
                      {[
                        "Section Name",
                        "Board",
                        "Academic Year",
                        "Group",
                        "Program",
                        "Academic Level",
                        "Room",
                        "Incharge",
                        "Capacity",
                        "Status",
                        "Actions",
                      ].map((title) => (
                        <th key={title}>{title}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="11">
                          <div className="cms-sec-loading">
                            <span className="cms-sec-loader" aria-hidden="true" />
                            <span>Loading data...</span>
                          </div>
                        </td>
                      </tr>
                    ) : shown.length ? (
                      shown.map((section) => (
                        <tr key={section.id}>
                          <td className="cms-strong cms-sec-name-cell" title={section.name}>
                            {section.name || "—"}
                          </td>
                          <td
                            className="cms-sec-board-code-cell"
                            title={resolveSection(section).boardName}
                          >
                            {resolveSection(section).boardCode}
                          </td>
                          <td title={resolveSection(section).academicYearName}>
                            {resolveSection(section).academicYearName}
                          </td>
                          <td title={resolveSection(section).groupName}>
                            {resolveSection(section).groupName}
                          </td>
                          <td title={resolveSection(section).programName}>
                            {resolveSection(section).programName}
                          </td>
                          <td title={resolveSection(section).academicLevelName}>
                            {resolveSection(section).academicLevelName}
                          </td>
                          <td title={resolveSection(section).roomDisplay}>
                            {resolveSection(section).roomDisplay}
                          </td>
                          <td title={resolveSection(section).teacherName}>
                            {resolveSection(section).teacherName}
                          </td>
                          <td title={String(section.strength || "—")}>{section.strength || "—"}</td>
                          <td>
                            <span
                              className={`cms-badge cms-sec-status-badge ${section.status === "Active" ? "cms-badge-active" : "cms-badge-inactive"}`}
                            >
                              {section.status}
                            </span>
                          </td>
                          <td>
                            <div className="cms-sec-table-actions">
                              <button
                                type="button"
                                className="cms-sec-action-btn"
                                onClick={() => openRow(section, true)}
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                type="button"
                                className="cms-sec-action-btn"
                                onClick={() => openRow(section, false)}
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                className="cms-sec-action-btn cms-sec-delete-action"
                                onClick={() => deleteSection(section)}
                                disabled={deletingSectionId === section.id}
                                aria-label={`Delete section ${section.name}`}
                                title={
                                  deletingSectionId === section.id
                                    ? "Deleting section..."
                                    : `Delete section ${section.name}`
                                }
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="11" className="cms-empty">
                          No sections found matching your criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="cms-sec-pagination">
                <span className="cms-sec-record-summary">
                  Showing {sectionRangeStart}–{sectionRangeEnd} of {rows.length} records
                </span>
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  disabled={page === 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </button>
                <span>
                  {page} / {pages}
                </span>
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  disabled={page === pages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </button>
              </div>
            </div>
            {modal && (
              <div
                className={`cms-sec-overlay ${mode === "add" ? "cms-sec-add-overlay" : ""}`}
                onClick={close}
              >
                <div
                  className="cms-modal cms-sec-modal"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="cms-modal-head">
                    <h3>
                      {preview
                        ? "Section Details"
                        : selected
                          ? edit
                            ? "Edit Section"
                            : "View Section"
                          : "Add Section"}
                    </h3>
                    <button type="button" className="cms-icon-btn" onClick={close}>
                      <X size={16} />
                    </button>
                  </div>
                  <form onSubmit={save}>
                    <div className="cms-modal-body">
                      {modalError && (
                        <div className="cms-modal-validation-toast" role="alert">
                          {modalError}
                        </div>
                      )}
                      {preview ? (
                        viewLoading ? (
                          <div className="cms-sec-loading">
                            <span className="cms-sec-loader" aria-hidden="true" />
                            <span>Loading Section details...</span>
                          </div>
                        ) : viewError ? (
                          <div className="cms-modal-validation-toast" role="alert">
                            {viewError}
                          </div>
                        ) : viewSection ? (
                          (() => {
                            const detail = resolveSection(viewSection);
                            const detailItems = [
                              ["Board", detail.boardName],
                              ["Academic Year", detail.academicYearName],
                              ["Academic Level", detail.academicLevelName],
                              ["Group", detail.groupName],
                              ["Program", detail.programName],
                              ["Room", detail.roomDisplay],
                              ["Incharge", detail.teacherName],
                              ["Maximum Strength", viewSection.strength || "—"],
                              [
                                "Created Date",
                                viewSection.createdAt
                                  ? new Date(viewSection.createdAt).toLocaleString()
                                  : "—",
                              ],
                              [
                                "Updated Date",
                                viewSection.updatedAt
                                  ? new Date(viewSection.updatedAt).toLocaleString()
                                  : "—",
                              ],
                            ];
                            return (
                              <div className="cms-card">
                                <div className="cms-sec-pagination">
                                  <strong title={viewSection.name}>
                                    {viewSection.name || "—"}
                                  </strong>
                                  <span
                                    className={`cms-badge ${viewSection.status === "Active" ? "cms-badge-active" : "cms-badge-inactive"}`}
                                  >
                                    {viewSection.status}
                                  </span>
                                </div>
                                <div className="cms-form-grid cms-sec-form-grid">
                                  {detailItems.map(([itemLabel, value]) => (
                                    <div className="cms-field" key={itemLabel}>
                                      <label>{itemLabel}</label>
                                      <span title={String(value)}>{value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()
                        ) : null
                      ) : (
                        <div className="cms-form-grid cms-sec-form-grid">
                          <FormField
                            label="Board"
                            value={form.board}
                            field="board"
                            options={boardOptions}
                            readOnly={readOnly}
                            change={change}
                          />
                          <FormField
                            label="Academic Year"
                            value={form.academicYearId}
                            field="academicYear"
                            options={academicYearOptions}
                            readOnly={readOnly}
                            change={change}
                          />
                          <FormField
                            label="Group"
                            value={form.groupId}
                            field="group"
                            options={groupOptions}
                            readOnly={readOnly}
                            change={change}
                          />
                          <FormField
                            label="Program"
                            value={form.groupProgramId || form.programId}
                            field="program"
                            options={programOptions}
                            readOnly={readOnly}
                            change={change}
                          />
                          <FormField
                            label="Academic Level"
                            value={form.academicLevel}
                            field="academicLevel"
                            options={academicLevelOptions}
                            readOnly={readOnly}
                            change={change}
                          />
                          <div className="cms-field">
                            <label>
                              Section Name <span className="req">*</span>
                            </label>
                            <input
                              value={form.name}
                              onChange={(event) => change("name", event.target.value)}
                              disabled={readOnly}
                            />
                          </div>
                          <div className="cms-field cms-sec-field cms-sec-room-field">
                            <label>
                              Room Number <span className="req">*</span>
                            </label>
                            <div className="cms-sec-room-field-row">
                              <Select
                                value={form.roomId}
                                onChange={(value) => change("room", value)}
                                options={availableRooms}
                                placeholder="Select Room Number"
                                disabled={readOnly}
                              />
                              {!readOnly && form.academicLevel && !availableRooms.length && (
                                <div className="cms-modal-empty-state">
                                  No active classroom rooms available. Add an active classroom room
                                  before assigning a room to this section.
                                </div>
                              )}
                              {!readOnly && (
                                <button
                                  type="button"
                                  className="cms-btn cms-btn-ghost cms-sec-add-room-btn"
                                  onClick={() => openRoomModal(true)}
                                >
                                  Add Room
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="cms-field cms-sec-field">
                            <label>
                              Incharge <span className="req">*</span>
                            </label>
                            <Select
                              value={form.classTeacherId}
                              onChange={(value) => change("teacher", value)}
                              options={availableTeachers}
                              placeholder="Select Incharge"
                              disabled={readOnly}
                            />
                          </div>
                          <div className="cms-field">
                            <label>
                              Capacity <span className="req">*</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={form.strength}
                              onChange={(event) => change("strength", event.target.value)}
                              disabled={readOnly}
                            />
                          </div>
                          <FormField
                            label="Status"
                            value={form.status}
                            field="status"
                            options={["Active", "Inactive"]}
                            readOnly={readOnly}
                            change={change}
                          />
                        </div>
                      )}
                    </div>
                    <div className="cms-modal-foot">
                      {!preview && (
                        <>
                          <button
                            type="button"
                            className="cms-btn cms-btn-ghost"
                            onClick={close}
                            disabled={savingSection}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="cms-btn cms-btn-primary"
                            disabled={savingSection}
                          >
                            {savingSection
                              ? selected
                                ? "Saving..."
                                : "Adding..."
                              : selected
                                ? "Save Changes"
                                : "Add Section"}
                          </button>
                        </>
                      )}
                      {preview && (
                        <>
                          <button type="button" className="cms-btn cms-btn-ghost" onClick={close}>
                            Close
                          </button>
                          <button
                            type="button"
                            className="cms-btn cms-btn-primary"
                            onClick={enterEditMode}
                            disabled={viewLoading || !viewSection}
                          >
                            Edit
                          </button>
                        </>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
        {activeTab === "rooms" && (
          <>
            <div className="cms-card">
              <div className="cms-toolbar cms-sec-toolbar cms-room-toolbar">
                <div className="cms-search cms-sec-search">
                  <Search size={16} />
                  <input
                    type="search"
                    placeholder={roomSearchPlaceholder}
                    value={roomSearch}
                    onChange={(event) => setRoomSearch(event.target.value)}
                  />
                </div>
                <div className="cms-sec-toolbar-filters cms-room-toolbar-filters">
                  <FilterField
                    label="Block Name"
                    value={roomFilters.building}
                    onChange={(value) =>
                      setRoomFilters((current) => ({ ...current, building: value }))
                    }
                    options={roomBuildings}
                    showLabel={false}
                  />
                  <FilterField
                    label="Floor"
                    value={roomFilters.floor}
                    onChange={(value) =>
                      setRoomFilters((current) => ({ ...current, floor: value }))
                    }
                    options={roomFloors}
                    showLabel={false}
                  />
                  <FilterField
                    label="Room Type"
                    value={roomFilters.roomType}
                    onChange={(value) =>
                      setRoomFilters((current) => ({ ...current, roomType: value }))
                    }
                    options={roomFilterTypes}
                    showLabel={false}
                  />
                </div>
                <div className="cms-sec-toolbar-spacer" />
                <button
                  type="button"
                  className="cms-btn cms-btn-primary cms-sec-compact-btn cms-room-add-btn"
                  onClick={() => openRoomModal(false)}
                >
                  Add Room
                </button>
              </div>
              <div className="cms-table-wrap cms-sec-table-wrap">
                <table className="cms-table cms-sec-table cms-room-table">
                  <thead>
                    <tr>
                      {[
                        "Room Code",
                        "Room Name",
                        "Block Name",
                        "Floor",
                        "Room Type",
                        "Capacity",
                        "Status",
                        "Actions",
                      ].map((title) => (
                        <th key={title}>{title}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loadingRooms ? (
                      <tr>
                        <td colSpan="8">
                          <div className="cms-sec-loading">
                            <span className="cms-sec-loader" aria-hidden="true" />
                            <span>Loading data...</span>
                          </div>
                        </td>
                      </tr>
                    ) : shownRooms.length ? (
                      shownRooms.map((room) => (
                        <tr key={room.id}>
                          <td className="cms-strong cms-sec-name-cell">{room.roomCode}</td>
                          <td>
                            <span className="cms-room-name-truncated" title={room.roomName}>
                              {room.roomName}
                            </span>
                          </td>
                          <td>{room.building}</td>
                          <td>{room.floor}</td>
                          <td>{room.roomType}</td>
                          <td>{room.capacity}</td>
                          <td>
                            <span
                              className={`cms-badge ${room.isActive ? "cms-badge-active" : "cms-badge-inactive"}`}
                            >
                              {room.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td>
                            <div className="cms-sec-table-actions">
                              <button
                                type="button"
                                className="cms-sec-action-btn"
                                onClick={() => openRoom(room, true)}
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                type="button"
                                className="cms-sec-action-btn"
                                onClick={() => openRoom(room)}
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                className="cms-sec-action-btn cms-sec-delete-action"
                                onClick={() => deleteRoom(room)}
                                disabled={deletingRoomId === room.id}
                                aria-label={`Delete room ${room.roomCode}`}
                                title={
                                  deletingRoomId === room.id
                                    ? "Deleting room..."
                                    : `Delete room ${room.roomCode}`
                                }
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" className="cms-empty">
                          No rooms found matching your criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="cms-sec-pagination">
                <span className="cms-sec-record-summary">
                  Showing {roomRangeStart}–{roomRangeEnd} of {roomRows.length} records
                </span>
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  disabled={roomPage === 1}
                  onClick={() => setRoomPage((current) => current - 1)}
                >
                  Previous
                </button>
                <span>
                  {roomPage} / {roomPages}
                </span>
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  disabled={roomPage === roomPages}
                  onClick={() => setRoomPage((current) => current + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
        {roomModal && (
          <div className="cms-sec-overlay cms-sec-room-overlay" onClick={closeRoomModal}>
            <div
              className="cms-modal cms-sec-modal cms-sec-room-modal cms-room-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="cms-modal-head">
                <h3>
                  {roomMode === "preview"
                    ? "View Room"
                    : roomMode === "edit"
                      ? "Edit Room"
                      : "Add Room"}
                </h3>
                <button type="button" className="cms-icon-btn" onClick={closeRoomModal}>
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={saveRoom}>
                <div className="cms-modal-body cms-sec-room-form cms-form-grid cms-sec-form-grid cms-room-form-grid">
                  {roomModalError && (
                    <div className="cms-modal-validation-toast" role="alert">
                      {roomModalError}
                    </div>
                  )}
                  <div className="cms-field">
                    <label>
                      Room Code <span className="cms-room-required-mark">*</span>
                    </label>
                    <input
                      value={roomForm.roomCode}
                      onChange={(event) => changeRoom("roomCode", event.target.value)}
                      disabled={roomMode === "preview"}
                    />
                  </div>
                  <div className="cms-field">
                    <label>
                      Room Name <span className="cms-room-required-mark">*</span>
                    </label>
                    <input
                      value={roomForm.roomName}
                      onChange={(event) => changeRoom("roomName", event.target.value)}
                      disabled={roomMode === "preview"}
                    />
                  </div>
                  <div className="cms-field">
                    <label>
                      Capacity <span className="cms-room-required-mark">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={roomForm.capacity}
                      onChange={(event) => changeRoom("capacity", event.target.value)}
                      disabled={roomMode === "preview"}
                    />
                  </div>
                  <div className="cms-field">
                    <label>
                      Room Type <span className="cms-room-required-mark">*</span>
                    </label>
                    <Select
                      value={roomForm.roomType}
                      onChange={(value) => changeRoom("roomType", value)}
                      options={roomTypes}
                      placeholder="Select room type"
                      disabled={roomMode === "preview"}
                    />
                  </div>
                  <div className="cms-field">
                    <label>
                      Block Name <span className="cms-room-required-mark">*</span>
                    </label>
                    <input
                      value={roomForm.building}
                      onChange={(event) => changeRoom("building", event.target.value)}
                      disabled={roomMode === "preview"}
                    />
                  </div>
                  <div className="cms-field">
                    <label>
                      Floor <span className="cms-room-required-mark">*</span>
                    </label>
                    <input
                      value={roomForm.floor}
                      onChange={(event) => changeRoom("floor", event.target.value)}
                      disabled={roomMode === "preview"}
                    />
                  </div>
                  <div className="cms-field cms-room-status-field">
                    <label>
                      Status <span className="cms-room-required-mark">*</span>
                    </label>
                    <Select
                      value={
                        roomForm.isActive === "" ? "" : roomForm.isActive ? "Active" : "Inactive"
                      }
                      onChange={(value) =>
                        changeRoom("isActive", value === "" ? "" : value === "Active")
                      }
                      options={["Active", "Inactive"]}
                      placeholder="Select Status"
                      disabled={roomMode === "preview"}
                    />
                  </div>
                </div>
                <div className="cms-modal-foot">
                  {roomMode !== "preview" && (
                    <>
                      <button
                        type="button"
                        className="cms-btn cms-btn-ghost"
                        onClick={closeRoomModal}
                        disabled={savingRoom}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="cms-btn cms-btn-primary"
                        disabled={savingRoom}
                      >
                        {savingRoom
                          ? "Saving..."
                          : roomMode === "edit"
                            ? "Save Changes"
                            : "Save Room"}
                      </button>
                    </>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}
        {toast && (
          <div className="cms-toast">
            <CheckCircle2 size={18} />
            <span>{toast}</span>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function FilterField({ label, value, onChange, options, disabled = false, showLabel = true }) {
  return (
    <div className="cms-field cms-sec-field">
      {showLabel && <label>{label}</label>}
      <Select
        value={value}
        onChange={onChange}
        options={options}
        placeholder={`Select ${label}`}
        disabled={disabled}
      />
    </div>
  );
}

function ConstrainedFilterField({ label, value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const placeholder = `Select ${label}`;

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const selectOption = (nextValue) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="cms-field cms-sec-field cms-constrained-filter">
      <button
        type="button"
        className="cms-sec-select-trigger cms-constrained-filter-trigger"
        aria-label={placeholder}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={value || placeholder}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{value || placeholder}</span>
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="cms-constrained-filter-menu" role="listbox" aria-label={`${label} options`}>
          <button
            type="button"
            role="option"
            aria-selected={!value}
            title={placeholder}
            onClick={() => selectOption("")}
          >
            {placeholder}
          </button>
          {options.length ? (
            options.map((option) => (
              <button
                type="button"
                role="option"
                aria-selected={option === value}
                title={option}
                key={option}
                onClick={() => selectOption(option)}
              >
                {option}
              </button>
            ))
          ) : (
            <span className="cms-constrained-filter-empty">No options available</span>
          )}
        </div>
      )}
    </div>
  );
}

function FormField({ label, value, field, options, disabled = false, readOnly, change }) {
  return (
    <div className="cms-field cms-sec-field">
      <label>
        {label} <span className="req">*</span>
      </label>
      <Select
        value={value}
        onChange={(next) => change(field, next)}
        options={options}
        placeholder={`Select ${label}`}
        disabled={disabled || readOnly}
      />
    </div>
  );
}

function Select({ value, onChange, options, placeholder, disabled = false }) {
  const normalizedOptions = options.map((option) =>
    typeof option === "object" && option !== null
      ? { value: String(option.value), label: String(option.label) }
      : { value: String(option), label: String(option) },
  );
  const selectedLabel =
    normalizedOptions.find((option) => option.value === String(value))?.label || "";
  return (
    <div className={`cms-sec-select ${disabled ? "is-disabled" : ""}`}>
      <select
        className="cms-sec-select-trigger"
        value={value}
        disabled={disabled}
        aria-label={placeholder}
        title={selectedLabel || placeholder}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{normalizedOptions.length ? placeholder : `${placeholder}`}</option>
        {normalizedOptions.map((option) => (
          <option key={option.value} value={option.value} title={option.label}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
