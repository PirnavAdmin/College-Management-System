import React, { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Plus, Search, X, CheckCircle2, Pencil } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import "./SectionManagementPage.css";

const PAGE_SIZE = 5;
const EMPTY = {
  board: "",
  academicYear: "",
  group: "",
  program: "",
  academicLevel: "",
  name: "",
  room: "",
  teacher: "",
  strength: "",
  status: "Active",
};
const EMPTY_ROOM = {
  roomCode: "",
  roomName: "",
  capacity: "",
  roomType: "",
  building: "",
  floor: "",
  isActive: true,
};
const EMPTY_FILTERS = { board: "", academicYear: "", group: "", program: "", academicLevel: "" };
const EMPTY_ROOM_FILTERS = { building: "", floor: "", roomType: "", status: "" };
const ROOM_TYPES = ["Classroom", "Laboratory", "Computer Lab", "Seminar Hall", "Library", "Examination Hall", "Staff Room", "Other"];
const label = (room) => room.roomCode;
const normalizeSectionName = (name) => name.trim().replace(/\s+/g, " ");
const normalizeRoomCode = (code) => String(code ?? "").trim().replace(/\s+/g, " ");
const roomCodesMatch = (first, second) =>
  normalizeRoomCode(first).toLowerCase() === normalizeRoomCode(second).toLowerCase();
const collectionFrom = (data) => Array.isArray(data) ? data : data?.data ?? data?.items ?? data?.result ?? [];
const isActiveRecord = (item) =>
  item?.isActive === true || item?.status === true || item?.status === "Active";
const normalizeRoom = (room) => ({
  ...room,
  id: room.roomId ?? room.id,
  roomCode: room.roomCode ?? room.roomNumber ?? "",
  roomName: room.roomName ?? "",
  capacity: room.capacity ?? 0,
  roomType: room.roomType ?? "",
  building: room.building ?? room.buildingName ?? "",
  floor: String(room.floor ?? ""),
  isActive: room.isActive ?? room.status === "Active",
});
const normalizeSection = (section) => ({
  ...section,
  id: section.sectionId ?? section.id,
  board: section.board ?? section.boardName ?? "",
  academicYear: section.academicYearName ?? section.academicYear ?? "",
  group: section.group ?? section.groupName ?? "",
  program: section.program ?? section.programme ?? section.programName ?? "",
  academicLevel: section.academicLevel ?? section.yearOfStudy ?? section.academicLevelName ?? "",
  name: section.sectionName ?? section.name ?? "",
  room: section.roomNumber ?? section.roomCode ?? "",
  teacher: section.classTeacherName ?? section.teacher ?? "",
  strength: section.maximumStrength ?? section.capacity ?? section.strength ?? "",
  status: section.isActive ?? section.status === "Active" ? "Active" : "Inactive",
});

// Future backend integration should relate sections to rooms by roomId, rather than roomCode.
// `strength` remains the current data-contract name for section capacity.

export const pageConfig = {
  title: "Section Management",
  subtitle: "Manage academic sections, classrooms and teacher assignments.",
  breadcrumb: ["Academics"],
};

export default function SectionManagementPage() {
  const [activeTab, setActiveTab] = useState("sections");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [sections, setSections] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [boardsList, setBoardsList] = useState([]);
  const [academicYearsList, setAcademicYearsList] = useState([]);
  const [groupsList, setGroupsList] = useState([]);
  const [programsList, setProgramsList] = useState([]);
  const [academicLevelsList, setAcademicLevelsList] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const [roomModal, setRoomModal] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [mode, setMode] = useState("add");
  const [form, setForm] = useState(EMPTY);
  const [roomForm, setRoomForm] = useState(EMPTY_ROOM);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [roomMode, setRoomMode] = useState("add");
  const [roomModalFromSection, setRoomModalFromSection] = useState(false);
  const [roomSearch, setRoomSearch] = useState("");
  const [roomFilters, setRoomFilters] = useState(EMPTY_ROOM_FILTERS);
  const [appliedRoomFilters, setAppliedRoomFilters] = useState(EMPTY_ROOM_FILTERS);
  const [roomPage, setRoomPage] = useState(1);
  const [toast, setToast] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [roomModalError, setRoomModalError] = useState(null);
  const toastTimer = useRef(null);

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
      setRooms(collectionFrom(response.data).map(normalizeRoom).filter((room) => room.id));
    } catch (error) {
      say(getApiErrorMessage(error));
    } finally {
      setLoadingRooms(false);
    }
  };
  const loadSections = async (params) => {
    const response = await apiClient.get(apiEndpoints.sections.list, { params });
    setSections(collectionFrom(response.data).map(normalizeSection).filter((section) => section.id));
  };
  const loadGroups = async (boardName, selectedGroupName = "") => {
    const board = boardsList.find((item) => item.name === boardName);
    if (!board) return setGroupsList([]);
    try {
      const response = await apiClient.get(apiEndpoints.groups.getAll, { params: { boardId: board.id } });
      const groups = collectionFrom(response.data)
        .filter(isActiveRecord)
        .map((item) => ({ id: String(item.groupId ?? item.id), name: item.groupName ?? item.name ?? "", boardId: String(item.boardId ?? "") }))
        .filter((item) => item.id && item.name);
      setGroupsList(groups);
      const selectedGroup = groups.find((item) => item.name === selectedGroupName);
      if (selectedGroup) {
        const programsResponse = await apiClient.get(apiEndpoints.groups.programs(selectedGroup.id));
        setProgramsList(collectionFrom(programsResponse.data)
          .filter(isActiveRecord)
          .map((item) => ({ id: String(item.programId ?? item.id), name: item.programName ?? item.name ?? "" }))
          .filter((item) => item.id && item.name));
      }
    } catch (error) {
      setGroupsList([]);
      say(getApiErrorMessage(error));
    }
  };
  const loadPrograms = async (groupName) => {
    const group = groupsList.find((item) => item.name === groupName);
    if (!group) return setProgramsList([]);
    try {
      const response = await apiClient.get(apiEndpoints.groups.programs(group.id));
      setProgramsList(collectionFrom(response.data)
        .filter(isActiveRecord)
        .map((item) => ({ id: String(item.programId ?? item.id), name: item.programName ?? item.name ?? "" }))
        .filter((item) => item.id && item.name));
    } catch (error) {
      setProgramsList([]);
      say(getApiErrorMessage(error));
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
        apiClient.get("/api/v1/faculty/dropdown"),
        apiClient.get(apiEndpoints.sections.list),
      ]);
      if (!active) return;
      const [boardsResult, yearsResult, levelsResult, facultyResult, sectionsResult] = results;
      if (boardsResult.status === "fulfilled") setBoardsList(collectionFrom(boardsResult.value.data).filter(isActiveRecord).map((item) => ({ id: String(item.boardId ?? item.id), name: item.boardName ?? item.name ?? "" })).filter((item) => item.id && item.name));
      if (yearsResult.status === "fulfilled") setAcademicYearsList(collectionFrom(yearsResult.value.data).filter(isActiveRecord).map((item) => ({ id: String(item.academicYearId ?? item.id), name: item.academicYearName ?? item.name ?? "" })).filter((item) => item.id && item.name));
      if (levelsResult.status === "fulfilled") setAcademicLevelsList(collectionFrom(levelsResult.value.data).map((item) => ({ id: String(item.academicLevelId ?? item.id), name: item.levelName ?? item.academicLevelName ?? item.name ?? "" })).filter((item) => item.id && item.name));
      if (facultyResult.status === "fulfilled") setTeachersList(collectionFrom(facultyResult.value.data).filter((item) => item.isActive !== false).map((item) => ({ id: String(item.facultyId ?? item.id), name: item.facultyName ?? item.name ?? "" })).filter((item) => item.id && item.name));
      if (sectionsResult.status === "fulfilled") setSections(collectionFrom(sectionsResult.value.data).map(normalizeSection).filter((section) => section.id));
      if (results.some((result) => result.status === "rejected")) say("Some Section Management data could not be loaded.");
      setLoading(false);
    };
    loadInitialData();
    loadRooms();
    return () => { active = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- initial API load is intentionally one-time.
  const updateFilter = (key, value) => {
    if (key === "board") loadGroups(value);
    if (key === "group") loadPrograms(value);
    setFilters((current) => {
      const next = { ...current, [key]: value };
      if (key === "board")
        Object.assign(next, { academicYear: "", group: "", program: "", academicLevel: "" });
      if (key === "academicYear")
        Object.assign(next, { group: "", program: "", academicLevel: "" });
      if (key === "group") Object.assign(next, { program: "", academicLevel: "" });
      if (key === "program") next.academicLevel = "";
      return next;
    });
  };
  const change = (key, value) => {
    setModalError(null);
    if (key === "board") loadGroups(value);
    if (key === "group") loadPrograms(value);
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "board")
        Object.assign(next, {
          academicYear: "",
          group: "",
          program: "",
          academicLevel: "",
          room: "",
          teacher: "",
        });
      if (key === "academicYear")
        Object.assign(next, { group: "", program: "", academicLevel: "", room: "", teacher: "" });
      if (key === "group") Object.assign(next, { program: "", academicLevel: "", room: "" });
      if (key === "program") Object.assign(next, { academicLevel: "", room: "" });
      if (key === "academicLevel") next.room = "";
      return next;
    });
  };
  const changeRoom = (key, value) => {
    setRoomModalError(null);
    setRoomForm((current) => ({ ...current, [key]: value }));
  };

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sections.filter((section) => {
      if (appliedFilters.board && section.board !== appliedFilters.board) return false;
      if (appliedFilters.academicYear && section.academicYear !== appliedFilters.academicYear)
        return false;
      if (appliedFilters.group && section.group !== appliedFilters.group) return false;
      if (appliedFilters.program && section.program !== appliedFilters.program) return false;
      if (appliedFilters.academicLevel && section.academicLevel !== appliedFilters.academicLevel)
        return false;
      return (
        !query ||
        [
          section.name,
          section.group,
          section.program,
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(query),
        )
      );
    });
  }, [sections, appliedFilters, search]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const roomRows = useMemo(() => {
    const query = roomSearch.trim().toLowerCase();
    return rooms.filter((room) => {
      if (appliedRoomFilters.building && room.building !== appliedRoomFilters.building) return false;
      if (appliedRoomFilters.floor && String(room.floor) !== appliedRoomFilters.floor) return false;
      if (appliedRoomFilters.roomType && room.roomType !== appliedRoomFilters.roomType) return false;
      if (appliedRoomFilters.status && (room.isActive ? "Active" : "Inactive") !== appliedRoomFilters.status) return false;
      return !query || [room.roomCode, room.roomName, room.building, room.floor, room.roomType]
        .some((value) => String(value ?? "").toLowerCase().includes(query));
    });
  }, [rooms, roomSearch, appliedRoomFilters]);
  const roomPages = Math.max(1, Math.ceil(roomRows.length / PAGE_SIZE));
  const shownRooms = roomRows.slice((roomPage - 1) * PAGE_SIZE, roomPage * PAGE_SIZE);
  const sectionSearchPlaceholder = useMemo(
    () => appliedFilters.group || appliedFilters.program ? "Search sections by name, group or program..." : "Search sections...",
    [appliedFilters.group, appliedFilters.program],
  );
  const roomSearchPlaceholder = useMemo(
    () => appliedRoomFilters.roomType || appliedRoomFilters.building ? "Search rooms by code, name or type..." : "Search rooms...",
    [appliedRoomFilters.roomType, appliedRoomFilters.building],
  );
  const roomBuildings = useMemo(() => [...new Set(rooms.map((room) => room.building).filter(Boolean))], [rooms]);
  const roomFloors = useMemo(() => [...new Set(rooms.map((room) => String(room.floor)).filter(Boolean))], [rooms]);
  const roomTypes = ROOM_TYPES;
  const boardOptions = useMemo(() => boardsList.map((item) => item.name), [boardsList]);
  const academicYearOptions = useMemo(() => academicYearsList.map((item) => item.name), [academicYearsList]);
  const groupOptions = useMemo(() => groupsList.map((item) => item.name), [groupsList]);
  const programOptions = useMemo(() => programsList.map((item) => item.name), [programsList]);
  const academicLevelOptions = useMemo(() => academicLevelsList.map((item) => item.name), [academicLevelsList]);
  useEffect(() => setPage(1), [appliedFilters, search]);
  useEffect(() => setRoomPage(1), [appliedRoomFilters, roomSearch]);
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
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  // `mode` is the single source of truth for add, edit, and preview states.
  const selected = selectedSectionId;
  const edit = mode === "edit";
  const preview = mode === "preview";
  const readOnly = mode === "preview";
  const availableRooms = useMemo(
    () =>
      (() => {
        const options = rooms
        .filter((room) => room.isActive && room.roomType === "Classroom")
        .filter(
          (room) =>
            !sections.some(
              (section) =>
                section.id !== selectedSectionId &&
                section.status === "Active" &&
                roomCodesMatch(section.room, label(room)),
            ),
        )
        .map(label);
        return form.room && !options.includes(form.room) ? [form.room, ...options] : options;
      })(),
    [rooms, sections, selectedSectionId, form.room],
  );
  const availableTeachers = teachersList.map((teacher) => teacher.name);

  const close = () => {
    setModal(false);
    setSelectedSectionId(null);
    setMode("add");
    setForm(EMPTY);
    setModalError(null);
  };
  const openAdd = () => {
    setSelectedSectionId(null);
    setMode("add");
    setForm(EMPTY);
    setModalError(null);
    setModal(true);
  };
  const openRow = (section, isPreview = false) => {
    setSelectedSectionId(section.id);
    setMode(isPreview ? "preview" : "edit");
    setForm({ ...section, strength: String(section.strength ?? "") });
    loadGroups(section.board, section.group);
    setModalError(null);
    setModal(true);
  };
  const enterEditMode = () => {
    setModalError(null);
    setMode("edit");
  };
  const openRoomModal = (fromSection = false) => {
    setRoomForm(EMPTY_ROOM);
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
    setRoomForm(EMPTY_ROOM);
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
  const save = async (event) => {
    event.preventDefault();
    const required = [
      "board",
      "academicYear",
      "group",
      "program",
      "academicLevel",
      "name",
      "room",
      "teacher",
      "status",
    ];
    if (required.some((key) => !String(form[key] || "").trim()))
      return setModalError("Please complete all required fields.");
    const normalizedName = normalizeSectionName(form.name);
    if (!/^[A-Za-z0-9 -]+$/.test(normalizedName))
      return setModalError("Section name may contain only letters, numbers, spaces, and hyphens.");
    const capacity = Number(form.strength);
    if (!String(form.strength).trim()) return setModalError("Capacity is required.");
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 150)
      return setModalError("Capacity must be between 1 and 150.");
    const selectedRoom = rooms.find((room) => roomCodesMatch(room.roomCode, form.room));
    if (form.status === "Active") {
      if (!selectedRoom || !selectedRoom.isActive)
        return setModalError("Please select an active classroom room.");
      if (selectedRoom.roomType !== "Classroom")
        return setModalError("Only Classroom rooms can be assigned to a section.");
      if (capacity > Number(selectedRoom.capacity))
        return setModalError(`Section capacity cannot exceed room capacity (${selectedRoom.capacity}).`);
      if (!availableTeachers.includes(form.teacher))
        return setModalError("Please select an available active class teacher.");
    }
    const other = (section) => section.id !== selectedSectionId;
    if (
      sections.some(
        (section) =>
          other(section) &&
          section.board === form.board &&
          section.academicYear === form.academicYear &&
          section.group === form.group &&
          section.program === form.program &&
          section.academicLevel === form.academicLevel &&
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
          roomCodesMatch(section.room, form.room),
      )
    )
      return setModalError("Selected room is already assigned to another active section.");
    const isEditing = Boolean(selectedSectionId);
    const board = boardsList.find((item) => item.name === form.board);
    const academicYear = academicYearsList.find((item) => item.name === form.academicYear);
    const group = groupsList.find((item) => item.name === form.group);
    const program = programsList.find((item) => item.name === form.program);
    const academicLevel = academicLevelsList.find((item) => item.name === form.academicLevel);
    const teacher = teachersList.find((item) => item.name === form.teacher);
    const roomId = selectedRoom?.id ?? form.roomId;
    const teacherId = teacher?.id ?? form.classTeacherId;
    if (!board || !academicYear || !group || !program || !academicLevel || !roomId || !teacherId)
      return setModalError("Please select valid current values from each dropdown.");
    const payload = {
      board: form.board,
      boardId: Number(board.id),
      academicYearId: Number(academicYear.id),
      group: form.group,
      groupId: Number(group.id),
      programme: form.program,
      program: form.program,
      academicLevel: form.academicLevel,
      yearOfStudy: form.academicLevel,
      sectionName: normalizedName,
      roomNumber: selectedRoom?.roomCode ?? form.room,
      roomId: Number(roomId),
      classTeacherId: Number(teacherId),
      maximumStrength: capacity,
      capacity,
      isActive: form.status === "Active",
    };
    setSubmitting(true);
    try {
      if (isEditing) await apiClient.put(apiEndpoints.sections.update(selectedSectionId), payload);
      else await apiClient.post(apiEndpoints.sections.create, payload);
      await loadSections();
      close();
      setSearch("");
      setPage(1);
      say(isEditing ? `Section "${normalizedName}" updated successfully!` : `Section "${normalizedName}" added successfully!`);
    } catch (error) {
      setModalError(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };
  const saveRoom = async (event) => {
    event.preventDefault();
    const room = {
      id: selectedRoomId || Date.now(),
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
    if (rooms.some((item) => item.id !== selectedRoomId && roomCodesMatch(item.roomCode, room.roomCode)))
      return setRoomModalError("A room with this code already exists.");
    const currentRoom = rooms.find((item) => item.id === selectedRoomId);
    const assignedSections = sections.filter(
      (section) =>
        section.status === "Active" &&
        roomCodesMatch(section.room, currentRoom?.roomCode ?? room.roomCode),
    );
    if (assignedSections.length && !roomCodesMatch(room.roomCode, currentRoom.roomCode))
      return setRoomModalError("Room code cannot be changed because this room is assigned to an active section.");
    if (
      assignedSections.length &&
      currentRoom.roomType === "Classroom" &&
      room.roomType !== "Classroom"
    )
      return setRoomModalError("Room type cannot be changed because this room is assigned to an active section.");
    const maxAssignedStrength = Math.max(0, ...assignedSections.map((section) => Number(section.strength) || 0));
    if (room.capacity < maxAssignedStrength)
      return setRoomModalError("Room capacity cannot be reduced below the strength of an assigned active section.");
    if (currentRoom?.isActive && !room.isActive && assignedSections.length)
      return setRoomModalError("Cannot deactivate this room because it is assigned to an active section.");

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
    };
    setSubmitting(true);
    try {
      if (isEditingRoom) await apiClient.put(`/api/v1/rooms/${selectedRoomId}`, payload);
      else await apiClient.post(apiEndpoints.rooms.getAll, payload);
      await loadRooms();
      if (!isEditingRoom && roomModalFromSection && room.isActive && room.roomType === "Classroom")
        setForm((current) => ({ ...current, room: room.roomCode }));
      closeRoomModal();
      setRoomSearch("");
      setRoomPage(1);
      say(isEditingRoom ? `Room "${room.roomCode}" ${room.isActive ? "updated" : "deactivated"} successfully!` : `Room "${room.roomCode}" added successfully!`);
    } catch (error) {
      setRoomModalError(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      title={activeTab === "sections" ? pageConfig.title : "Room Management"}
      subtitle={activeTab === "sections" ? pageConfig.subtitle : "Manage classrooms, capacities and room allocation setup."}
      breadcrumb={pageConfig.breadcrumb}
    >
      <div className="cms-sec-container">
        <div className="cms-room-tabs" role="tablist" aria-label="Management modules">
          <button type="button" role="tab" aria-selected={activeTab === "sections"} className={`cms-room-tab ${activeTab === "sections" ? "cms-room-tab-active" : ""}`} onClick={() => setActiveTab("sections")}>
            Section Management
          </button>
          <button type="button" role="tab" aria-selected={activeTab === "rooms"} className={`cms-room-tab ${activeTab === "rooms" ? "cms-room-tab-active" : ""}`} onClick={() => setActiveTab("rooms")}>
            Room Management
          </button>
        </div>
        {activeTab === "sections" && <>
        <div className="cms-card cms-sec-filter-card">
          <div className="cms-sec-filter-grid">
            <FilterField
              label="Board"
              value={filters.board}
              onChange={(value) => updateFilter("board", value)}
              options={boardOptions}
            />
            <FilterField
              label="Academic Year"
              value={filters.academicYear}
              onChange={(value) => updateFilter("academicYear", value)}
              options={academicYearOptions}
              disabled={!filters.board}
            />
            <FilterField
              label="Group"
              value={filters.group}
              onChange={(value) => updateFilter("group", value)}
              options={groupOptions}
              disabled={!filters.academicYear}
            />
            <FilterField
              label="Program"
              value={filters.program}
              onChange={(value) => updateFilter("program", value)}
              options={filters.group ? programOptions : []}
              disabled={!filters.group}
            />
            <FilterField
              label="Academic Level"
              value={filters.academicLevel}
              onChange={(value) => updateFilter("academicLevel", value)}
              options={academicLevelOptions}
              disabled={!filters.program}
            />
          </div>
          <div className="cms-sec-filter-actions">
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              onClick={() => {
                setFilters(EMPTY_FILTERS);
                setAppliedFilters(EMPTY_FILTERS);
                setSearch("");
                setPage(1);
              }}
            >
              Reset
            </button>
            <button
              type="button"
              className="cms-btn cms-btn-primary"
              onClick={() => {
                setAppliedFilters({ ...filters });
                setPage(1);
              }}
            >
              Check Sections
            </button>
          </div>
        </div>
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
            <button
              type="button"
              className="cms-btn cms-btn-primary cms-sec-compact-btn"
              onClick={openAdd}
            >
              {/* <Plus size={15} /> */}
              Add Section
            </button>
          </div>
          <div className="cms-table-wrap cms-sec-table-wrap">
            <table className="cms-table cms-sec-table">
              <thead>
                <tr>
                  {[
                    "Section Name",
                    "Group",
                    "Program",
                    "Academic Level",
                    "Room Number",
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
                {shown.length ? (
                  shown.map((section) => (
                    <tr key={section.id}>
                      <td className="cms-strong cms-sec-name-cell">{section.name}</td>
                      <td>{section.group}</td>
                      <td>{section.program}</td>
                      <td>{section.academicLevel}</td>
                      <td>{section.room}</td>
                      <td>{section.teacher}</td>
                      <td>{section.strength}</td>
                      <td>
                        <span
                          className={`cms-badge ${section.status === "Active" ? "cms-badge-active" : "cms-badge-inactive"}`}
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
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="cms-empty">
                      No sections found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="cms-sec-pagination">
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
          <div className="cms-sec-overlay" onClick={close}>
            <div className="cms-modal cms-sec-modal" onClick={(event) => event.stopPropagation()}>
              <div className="cms-modal-head">
                <h3>{preview ? "Preview Section" : selected ? (edit ? "Edit Section" : "View Section") : "Add Section"}</h3>
                <button type="button" className="cms-icon-btn" onClick={close}>
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={save}>
                <div className="cms-modal-body">
                  {modalError && <div className="cms-modal-validation-toast" role="alert">{modalError}</div>}
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
                      value={form.academicYear}
                      field="academicYear"
                      options={academicYearOptions}
                      disabled={!form.board}
                      readOnly={readOnly}
                      change={change}
                    />
                    <FormField
                      label="Group"
                      value={form.group}
                      field="group"
                      options={groupOptions}
                      disabled={!form.academicYear}
                      readOnly={readOnly}
                      change={change}
                    />
                    <FormField
                      label="Program"
                      value={form.program}
                      field="program"
                      options={form.group ? programOptions : []}
                      disabled={!form.group}
                      readOnly={readOnly}
                      change={change}
                    />
                    <FormField
                      label="Academic Level"
                      value={form.academicLevel}
                      field="academicLevel"
                      options={academicLevelOptions}
                      disabled={!form.program}
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
                          value={form.room}
                          onChange={(value) => change("room", value)}
                          options={availableRooms}
                          placeholder="Select Room Number"
                          disabled={!form.academicLevel || readOnly}
                        />
                        {!readOnly && form.academicLevel && !availableRooms.length && (
                          <div className="cms-modal-empty-state">No active classroom rooms available. Add an active classroom room before assigning a room to this section.</div>
                        )}
                        {!readOnly && (
                          <button
                            type="button"
                            className="cms-btn cms-btn-ghost cms-sec-add-room-btn"
                            onClick={() => openRoomModal(true)}
                          >
                            {/* <Plus size={13} /> */}
                            Add Room
                          </button>
                        )}
                      </div>
                    </div>
                    <FormField
                      label="Incharge"
                      value={form.teacher}
                      field="teacher"
                      options={availableTeachers}
                      disabled={!form.academicYear}
                      readOnly={readOnly}
                      change={change}
                    />
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
                </div>
                <div className="cms-modal-foot">
                  {!preview && <>
                    <button type="button" className="cms-btn cms-btn-ghost" onClick={close}>
                      Cancel
                    </button>
                    <button type="submit" className="cms-btn cms-btn-primary">
                      {selected ? "Save Changes" : "Add Section"}
                    </button>
                  </>}
                </div>
              </form>
            </div>
          </div>
        )}
        </>}
        {activeTab === "rooms" && (
          <>
          <div className="cms-card cms-sec-filter-card cms-room-filter-card">
            <div className="cms-room-filter-grid">
              <FilterField label="Block Name" value={roomFilters.building} onChange={(value) => setRoomFilters((current) => ({ ...current, building: value }))} options={roomBuildings} />
              <FilterField label="Floor" value={roomFilters.floor} onChange={(value) => setRoomFilters((current) => ({ ...current, floor: value }))} options={roomFloors} />
              <FilterField label="Room Type" value={roomFilters.roomType} onChange={(value) => setRoomFilters((current) => ({ ...current, roomType: value }))} options={roomTypes} />
              <FilterField label="Status" value={roomFilters.status} onChange={(value) => setRoomFilters((current) => ({ ...current, status: value }))} options={["Active", "Inactive"]} />
            </div>
            <div className="cms-sec-filter-actions">
              <button type="button" className="cms-btn cms-btn-ghost" onClick={() => { setRoomFilters(EMPTY_ROOM_FILTERS); setAppliedRoomFilters(EMPTY_ROOM_FILTERS); setRoomSearch(""); setRoomPage(1); }}>Reset</button>
              <button type="button" className="cms-btn cms-btn-primary" onClick={() => { setAppliedRoomFilters({ ...roomFilters }); setRoomPage(1); }}>Check Rooms</button>
            </div>
          </div>
          <div className="cms-card">
            <div className="cms-toolbar cms-sec-toolbar cms-room-toolbar">
              <div className="cms-search cms-sec-search">
                <Search size={16} />
                <input type="search" placeholder={roomSearchPlaceholder} value={roomSearch} onChange={(event) => setRoomSearch(event.target.value)} />
              </div>
              <button type="button" className="cms-btn cms-btn-primary cms-room-add-btn" onClick={openRoomModal}>
                {/* <Plus size={15} /> */}
                Add Room
                </button>
            </div>
            <div className="cms-table-wrap cms-sec-table-wrap">
              <table className="cms-table cms-sec-table cms-room-table">
                <thead><tr>{["Room Code", "Room Name", "Block Name", "Floor", "Room Type", "Capacity", "Status", "Actions"].map((title) => <th key={title}>{title}</th>)}</tr></thead>
                <tbody>{shownRooms.length ? shownRooms.map((room) => <tr key={room.id}>
                  <td className="cms-strong cms-sec-name-cell">{room.roomCode}</td><td>{room.roomName}</td><td>{room.building}</td><td>{room.floor}</td><td>{room.roomType}</td><td>{room.capacity}</td>
                  <td><span className={`cms-badge ${room.isActive ? "cms-badge-active" : "cms-badge-inactive"}`}>{room.isActive ? "Active" : "Inactive"}</span></td>
                  <td><div className="cms-sec-table-actions"><button type="button" className="cms-sec-action-btn" onClick={() => openRoom(room, true)}><Eye size={14} /></button><button type="button" className="cms-sec-action-btn" onClick={() => openRoom(room)}><Pencil size={14} /></button></div></td>
                </tr>) : <tr><td colSpan="8" className="cms-empty">No rooms found matching your criteria.</td></tr>}</tbody>
              </table>
            </div>
            <div className="cms-sec-pagination"><button type="button" className="cms-btn cms-btn-ghost" disabled={roomPage === 1} onClick={() => setRoomPage((current) => current - 1)}>Previous</button><span>{roomPage} / {roomPages}</span><button type="button" className="cms-btn cms-btn-ghost" disabled={roomPage === roomPages} onClick={() => setRoomPage((current) => current + 1)}>Next</button></div>
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
                <h3>{roomMode === "preview" ? "View Room" : roomMode === "edit" ? "Edit Room" : "Add Room"}</h3>
                <button type="button" className="cms-icon-btn" onClick={closeRoomModal}>
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={saveRoom}>
                <div
                  className="cms-modal-body cms-sec-room-form cms-form-grid cms-sec-form-grid cms-room-form-grid"
                >
                  {roomModalError && <div className="cms-modal-validation-toast" role="alert">{roomModalError}</div>}
                  <div className="cms-field">
                    <label>Room Code <span className="cms-room-required-mark">*</span></label>
                    <input
                      value={roomForm.roomCode}
                      onChange={(event) =>
                        changeRoom("roomCode", event.target.value)
                      }
                    disabled={roomMode === "preview"} />
                  </div>
                  <div className="cms-field">
                    <label>Room Name</label>
                    <input
                      value={roomForm.roomName}
                      onChange={(event) =>
                        changeRoom("roomName", event.target.value)
                      }
                    disabled={roomMode === "preview"} />
                  </div>
                  <div className="cms-field">
                    <label>Capacity <span className="cms-room-required-mark">*</span></label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={roomForm.capacity}
                      onChange={(event) =>
                        changeRoom("capacity", event.target.value)
                      }
                    disabled={roomMode === "preview"} />
                  </div>
                  <div className="cms-field">
                    <label>Room Type <span className="cms-room-required-mark">*</span></label>
                    <Select value={roomForm.roomType} onChange={(value) => changeRoom("roomType", value)} options={roomTypes} placeholder="Select room type" disabled={roomMode === "preview"} />
                  </div>
                  <div className="cms-field">
                    <label>Block Name <span className="cms-room-required-mark">*</span></label>
                    <input
                      value={roomForm.building}
                      onChange={(event) =>
                        changeRoom("building", event.target.value)
                      }
                    disabled={roomMode === "preview"} />
                  </div>
                  <div className="cms-field">
                    <label>Floor <span className="cms-room-required-mark">*</span></label>
                    <input
                      value={roomForm.floor}
                      onChange={(event) =>
                        changeRoom("floor", event.target.value)
                      }
                    disabled={roomMode === "preview"} />
                  </div>
                  <div className="cms-field cms-room-status-field">
                    <label>Status <span className="cms-room-required-mark">*</span></label>
                    <Select
                      value={roomForm.isActive ? "Active" : "Inactive"}
                      onChange={(value) =>
                        changeRoom("isActive", value === "Active")
                      }
                      options={["Active", "Inactive"]}
                      placeholder="Status"
                      disabled={roomMode === "preview"}
                    />
                  </div>
                </div>
                <div className="cms-modal-foot">
                  {roomMode !== "preview" && <>
                    <button
                      type="button"
                      className="cms-btn cms-btn-ghost"
                      onClick={closeRoomModal}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="cms-btn cms-btn-primary">{roomMode === "edit" ? "Save Changes" : "Save Room"}</button>
                  </>}
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

function FilterField({ label, value, onChange, options, disabled = false }) {
  return (
    <div className="cms-field cms-sec-field">
      <label>{label}</label>
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
function FormField({
  label,
  value,
  field,
  options,
  disabled = false,
  readOnly,
  change,
}) {
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
  return (
    <div className={`cms-sec-select ${disabled ? "is-disabled" : ""}`}>
      <select
        className="cms-sec-select-trigger"
        value={value}
        disabled={disabled}
        aria-label={placeholder}
        onChange={(event) => onChange(event.target.value)}
      >
        {!value && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
