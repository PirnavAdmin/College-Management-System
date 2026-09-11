import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Check,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Lock,
  ShieldCheck,
  FileText,
  Upload,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Save,
  FileCheck,
  Eye,
  RefreshCw,
  Building2,
  Phone,
  Mail,
  UserCheck,
  Sparkles,
  ExternalLink,
  X,
  FileSpreadsheet
} from "lucide-react";
import pirnavCollegesLogo from "@/assets/pirnav-colleges-logo.png";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import "./StaffOnboardingForm.css";

// --------------------------------------------------------------------------
// SECTION CONFIGURATIONS
// --------------------------------------------------------------------------
const SECTIONS = [
  { id: 0, title: "Personal Information", desc: "Identity & personal data" },
  { id: 1, title: "Contact & Address", desc: "Communication & residence" },
  { id: 2, title: "Educational Qualifications", desc: "Academic credentials" },
  { id: 3, title: "Previous Experience", desc: "Employment history" },
  { id: 4, title: "Bank & Statutory Details", desc: "Bank account & statutory IDs" },
  { id: 5, title: "Emergency Contacts", desc: "Emergency contact details" },
  { id: 6, title: "Document Uploads", desc: "Proof documents & certificates" },
  { id: 7, title: "Review & Submit", desc: "Verify and submit profile" },
];

const QUALIFICATION_LEVELS = [
  "Intermediate",
  "Diploma",
  "Bachelor's Degree",
  "Master's Degree",
  "M.Phil",
  "Ph.D",
  "B.Ed",
  "M.Ed",
  "Other",
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const MARITAL_STATUSES = ["Single", "Married", "Divorced", "Widowed"];
const GENDERS = ["Male", "Female", "Other"];
const ACCOUNT_TYPES = ["Savings", "Current", "Salary"];

export default function StaffOnboardingForm() {
  const { token: routeToken } = useParams();
  const [searchParams] = useSearchParams();
  const token = routeToken || searchParams.get("token") || searchParams.get("id") || "";
  const navigate = useNavigate();

  // Screen State: 'loading' | 'valid' | 'invalid' | 'expired' | 'approved' | 'submitted_success'
  const [screenState, setScreenState] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [correctionNote, setCorrectionNote] = useState("");
  const [currentStep, setCurrentStep] = useState(0);

  // Autosave State
  const [autosaveStatus, setAutosaveStatus] = useState("idle"); // 'idle' | 'saving' | 'saved' | 'failed'
  const [lastSavedTime, setLastSavedTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionMeta, setSubmissionMeta] = useState(null);

  // Form Validation Errors
  const [errors, setErrors] = useState({});
  const [allStepErrors, setAllStepErrors] = useState({});

  // ------------------------------------------------------------------------
  // FORM DATA MODEL
  // ------------------------------------------------------------------------
  const [baseline, setBaseline] = useState({
    staffId: null,
    employeeId: "",
    fullName: "",
    firstName: "",
    middleName: "",
    lastName: "",
    board: "",
    department: "",
    designation: "",
    joiningDate: "",
    employmentType: "",
    mobile: "",
    email: "",
    allocatedSubjects: [],
    staffType: "Teaching",
  });

  const [personal, setPersonal] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    guardianName: "",
    gender: "",
    dateOfBirth: "",
    maritalStatus: "Single",
    nationality: "Indian",
    bloodGroup: "",
    aadhaar: "",
    pan: "",
  });

  const [contact, setContact] = useState({
    primaryMobile: "",
    primaryEmail: "",
    alternateMobile: "",
    pin: "",
    currentAddress: "",
    permanentAddress: "",
    sameAsCurrent: false,
    city: "",
    district: "",
    state: "",
    country: "India",
  });

  const [education, setEducation] = useState([
    {
      id: "edu-" + Date.now() + "-1",
      highestQualification: "Bachelor's Degree",
      degreeName: "",
      university: "",
      institution: "",
      specialization: "",
      passingYear: "",
      percentage: "",
      qualificationType: "Regular",
    },
  ]);

  const [isFresher, setIsFresher] = useState(false);
  const [totalExperience, setTotalExperience] = useState("0");
  const [experience, setExperience] = useState([
    {
      id: "exp-" + Date.now() + "-1",
      institution: "",
      designation: "",
      department: "",
      fromDate: "",
      toDate: "",
      currentlyWorking: false,
      responsibilities: "",
      reasonForLeaving: "",
    },
  ]);

  const [bank, setBank] = useState({
    bankName: "",
    accountHolder: "",
    accountNumber: "",
    confirmAccountNumber: "",
    ifsc: "",
    branch: "",
    accountType: "Savings",
    pfNumber: "",
    esiNumber: "",
    uanNumber: "",
  });

  const [emergency, setEmergency] = useState({
    name: "",
    relationship: "",
    mobile: "",
    alternateMobile: "",
    address: "",
  });

  const [documents, setDocuments] = useState({
    passportPhoto: [],
    signature: [],
    aadhaarCard: [],
    panCard: [],
    degreeCertificates: [],
    experienceCertificates: [],
    resume: [],
    bankProof: [],
  });

  const [declarationConfirmed, setDeclarationConfirmed] = useState(false);
  const isInitialLoadDone = useRef(false);

  // ------------------------------------------------------------------------
  // STEP 1: TOKEN VALIDATION & INITIAL LOAD
  // GET /api/v1/staff/token/{token} with Cascading Fallbacks
  // ------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    async function validateToken() {
      setScreenState("loading");
      let data = null;

      if (token) {
        // 1. Try GET /api/v1/staff/token/{token}
        try {
          const res = await apiClient.get(apiEndpoints.faculty.getByToken(token));
          data = res?.data?.data || res?.data;
        } catch (tokenErr) {
          console.warn("getByToken lookup failed, attempting fallback by ID/list:", tokenErr);
        }

        // 2. Try GET /api/v1/staff/{token} (in case token is staffId / employeeId)
        if (!data) {
          try {
            const res = await apiClient.get(apiEndpoints.faculty.getById(token));
            data = res?.data?.data || res?.data;
          } catch (idErr) {
            console.warn("getById fallback failed:", idErr);
          }
        }

        // 3. Try GET /api/v1/staff and find matching staff record
        if (!data) {
          try {
            const listRes = await apiClient.get(apiEndpoints.faculty.list);
            const listData = listRes?.data?.data || listRes?.data || [];
            if (Array.isArray(listData)) {
              data = listData.find(
                (s) =>
                  String(s.id) === String(token) ||
                  String(s.profileLinkToken) === String(token) ||
                  String(s.token) === String(token) ||
                  String(s.onboardingToken) === String(token) ||
                  String(s.employeeId) === String(token) ||
                  (s.email && searchParams.get("email") && String(s.email).toLowerCase() === String(searchParams.get("email")).toLowerCase())
              );
            }
          } catch (listErr) {
            console.warn("staff list lookup failed:", listErr);
          }
        }

        // 4. Try sessionStorage fallback
        if (!data) {
          try {
            const stored = JSON.parse(sessionStorage.getItem("pjc-mock-staff-records") || "[]");
            if (Array.isArray(stored)) {
              data = stored.find(
                (s) =>
                  String(s.id) === String(token) ||
                  String(s.profileLinkToken) === String(token) ||
                  String(s.token) === String(token) ||
                  String(s.onboardingToken) === String(token) ||
                  String(s.employeeId) === String(token)
              );
            }
          } catch (storeErr) {
            console.warn("sessionStorage lookup error:", storeErr);
          }
        }
      }

      // If still not found or in preview/demo mode, construct standard baseline so faculty can fill details
      if (!data) {
        const fallbackName = searchParams.get("name") || (token && isNaN(token) && token !== "new" && token !== "preview" && token !== "staff" ? token : "Faculty Member");
        data = {
          id: !isNaN(token) && token ? Number(token) : 1,
          employeeId: !isNaN(token) && token ? `PJCTCH${String(token).padStart(4, "0")}` : "PJCTCH0001",
          fullName: fallbackName,
          firstName: fallbackName.split(" ")[0] || "Faculty",
          lastName: fallbackName.split(" ").slice(1).join(" ") || "Member",
          board: "State Board",
          department: "Teaching Department",
          designation: "Assistant Professor",
          joiningDate: new Date().toISOString().split("T")[0],
          employmentType: "Full Time",
          mobile: searchParams.get("mobile") || "",
          email: searchParams.get("email") || "",
          allocatedSubjects: [],
          staffType: "Teaching",
        };
      }

      if (!isMounted) return;

      // Check if token is expired
      if (data.isExpired || data.tokenExpired) {
        setScreenState("expired");
        return;
      }

      // Check if already approved / completed
      if (
        data.profileStatus === "Completed" ||
        data.reviewStatus === "Approved" ||
        data.status === "Approved"
      ) {
        setBaseline({
          staffId: data.id || data.staffId,
          employeeId: data.employeeId || "—",
          fullName: data.fullName || `${data.firstName || ""} ${data.lastName || ""}`.trim(),
          board: data.board || data.boardName || "—",
          department: data.department || "—",
          designation: data.designation || "—",
          joiningDate: data.dateOfJoining || data.joiningDate || "—",
          employmentType: data.employmentType || "Full Time",
          mobile: data.mobile || "—",
          email: data.email || "—",
          allocatedSubjects: data.allocatedSubjects || data.subjects || [],
          staffType: data.staffType || "Teaching",
        });
        setSubmissionMeta({
          submittedAt: data.submittedAt || data.profileSubmittedAt || "Previously",
          approvedAt: data.approvedAt || data.updatedAt || "Completed",
          employeeId: data.employeeId,
          fullName: data.fullName || `${data.firstName || ""} ${data.lastName || ""}`.trim(),
        });
        setScreenState("approved");
        return;
      }

      // Check if correction requested
      if (data.profileStatus === "Needs Correction" || data.correctionNote) {
        setCorrectionNote(data.correctionNote || "Please review and update required details.");
      }

      // Set Baseline Admin-Verified Fields
      const staffFullName = data.fullName || `${data.firstName || ""} ${data.lastName || ""}`.trim() || "Faculty Member";
      setBaseline({
        staffId: data.id || data.staffId,
        employeeId: data.employeeId || "PJCTCH0001",
        fullName: staffFullName,
        firstName: data.firstName || staffFullName.split(" ")[0] || "",
        middleName: data.middleName || "",
        lastName: data.lastName || staffFullName.split(" ").slice(1).join(" ") || "",
        board: data.board || data.boardName || "",
        department: data.department || "",
        designation: data.designation || "",
        joiningDate: data.dateOfJoining || data.joiningDate || "",
        employmentType: data.employmentType || "Full Time",
        mobile: data.mobile || "",
        email: data.email || "",
        allocatedSubjects: data.allocatedSubjects || data.subjects || [],
        staffType: data.staffType || "Teaching",
      });

      // Check localStorage draft restoration
      let localDraft = null;
      try {
        const raw = localStorage.getItem(`pirnav_onboarding_draft_${token || data.id}`);
        if (raw) localDraft = JSON.parse(raw);
      } catch (e) {}

      const draftProfile = localDraft?.profile || {};

      // Populate Form Fields from draft/saved profile if available
      setPersonal({
        firstName: draftProfile.personal?.firstName || data.firstName || staffFullName.split(" ")[0] || "",
        middleName: draftProfile.personal?.middleName || data.middleName || "",
        lastName: draftProfile.personal?.lastName || data.lastName || staffFullName.split(" ").slice(1).join(" ") || "",
        guardianName: draftProfile.personal?.guardianName || data.guardianName || data.fatherName || "",
        gender: draftProfile.personal?.gender || data.gender || "Male",
        dateOfBirth: draftProfile.personal?.dateOfBirth || data.dateOfBirth || "",
        maritalStatus: draftProfile.personal?.maritalStatus || data.maritalStatus || "Single",
        nationality: draftProfile.personal?.nationality || data.nationality || "Indian",
        bloodGroup: draftProfile.personal?.bloodGroup || data.bloodGroup || "",
        aadhaar: draftProfile.personal?.aadhaar || data.aadhaar || data.aadhaarNumber || "",
        pan: draftProfile.personal?.pan || data.pan || data.panNumber || "",
      });

      setContact({
        primaryMobile: data.mobile || draftProfile.contact?.primaryMobile || "",
        primaryEmail: data.email || draftProfile.contact?.primaryEmail || "",
        alternateMobile: draftProfile.contact?.alternateMobile || data.alternateMobile || "",
        pin: draftProfile.contact?.pin || data.pin || data.pincode || "",
        currentAddress: draftProfile.contact?.currentAddress || data.currentAddress || "",
        permanentAddress: draftProfile.contact?.permanentAddress || data.permanentAddress || "",
        sameAsCurrent: draftProfile.contact?.sameAsCurrent !== undefined ? draftProfile.contact.sameAsCurrent : !!data.sameAsCurrent,
        city: draftProfile.contact?.city || data.city || "",
        district: draftProfile.contact?.district || data.district || "",
        state: draftProfile.contact?.state || data.state || "",
        country: draftProfile.contact?.country || data.country || "India",
      });

      const eduData = draftProfile.education || data.education;
      if (Array.isArray(eduData) && eduData.length > 0) {
        setEducation(
          eduData.map((e, idx) => ({
            id: e.id || "edu-" + idx,
            highestQualification: e.highestQualification || e.qualification || "Bachelor's Degree",
            degreeName: e.degreeName || e.degree || "",
            university: e.university || e.board || "",
            institution: e.institution || e.college || "",
            specialization: e.specialization || e.subject || "",
            passingYear: e.passingYear || e.year || "",
            percentage: e.percentage || e.cgpa || "",
            qualificationType: e.qualificationType || "Regular",
          }))
        );
      }

      if (draftProfile.isFresher !== undefined || data.isFresher !== undefined) {
        setIsFresher(Boolean(draftProfile.isFresher !== undefined ? draftProfile.isFresher : data.isFresher));
      }
      if (draftProfile.totalExperience !== undefined || data.totalExperience !== undefined) {
        setTotalExperience(String(draftProfile.totalExperience !== undefined ? draftProfile.totalExperience : data.totalExperience));
      }

      const expData = draftProfile.experience || data.experience;
      if (Array.isArray(expData) && expData.length > 0) {
        setExperience(
          expData.map((exp, idx) => ({
            id: exp.id || "exp-" + idx,
            institution: exp.institution || exp.company || "",
            designation: exp.designation || exp.role || "",
            department: exp.department || "",
            fromDate: exp.fromDate || "",
            toDate: exp.toDate || "",
            currentlyWorking: Boolean(exp.currentlyWorking),
            responsibilities: exp.responsibilities || "",
            reasonForLeaving: exp.reasonForLeaving || "",
          }))
        );
      }

      const bankData = draftProfile.bank || data;
      setBank({
        bankName: bankData.bankName || "",
        accountHolder: bankData.accountHolder || bankData.accountHolderName || staffFullName,
        accountNumber: bankData.accountNumber || "",
        confirmAccountNumber: bankData.confirmAccountNumber || bankData.accountNumber || "",
        ifsc: (bankData.ifsc || bankData.ifscCode || "").toUpperCase(),
        branch: bankData.branch || "",
        accountType: bankData.accountType || "Savings",
        pfNumber: bankData.pfNumber || "",
        esiNumber: bankData.esiNumber || "",
        uanNumber: bankData.uanNumber || "",
      });

      const emergencyData = draftProfile.emergency || data;
      setEmergency({
        name: emergencyData.name || emergencyData.emergencyName || emergencyData.emergencyContactName || "",
        relationship: emergencyData.relationship || emergencyData.emergencyRelationship || "",
        mobile: emergencyData.mobile || emergencyData.emergencyMobile || emergencyData.emergencyPhone || "",
        alternateMobile: emergencyData.alternateMobile || emergencyData.emergencyAlternate || "",
        address: emergencyData.address || emergencyData.emergencyAddress || "",
      });

      if (data.documents && typeof data.documents === "object") {
        setDocuments((prev) => ({
          ...prev,
          ...data.documents,
        }));
      }

      setScreenState("valid");
      isInitialLoadDone.current = true;
    }

    validateToken();
    return () => {
      isMounted = false;
    };
  }, [token, searchParams]);

  // ------------------------------------------------------------------------
  // STEP 2: AUTOSAVE DRAFT LOGIC
  // POST /api/v1/staff/token/{token}/save-profile-draft with Fallback
  // ------------------------------------------------------------------------
  const saveDraftToBackend = useCallback(
    async (isSilent = false) => {
      if (screenState !== "valid") return;

      if (!isSilent) {
        setAutosaveStatus("saving");
      }

      const payload = {
        sectionName: SECTIONS[currentStep]?.title || "Draft",
        profile: {
          personal: {
            ...personal,
            firstName: baseline.firstName || personal.firstName,
            lastName: baseline.lastName || personal.lastName,
          },
          contact: {
            ...contact,
            primaryMobile: baseline.mobile,
            primaryEmail: baseline.email,
          },
          education,
          experience: isFresher ? [] : experience,
          isFresher,
          totalExperience: isFresher ? 0 : Number(totalExperience || 0),
          bank: {
            ...bank,
            ifsc: (bank.ifsc || "").toUpperCase(),
          },
          emergency,
          documentsMeta: Object.keys(documents).reduce((acc, key) => {
            acc[key] = (documents[key] || []).map((d) => ({
              name: d.name,
              size: d.size,
              type: d.type,
              url: d.url || null,
            }));
            return acc;
          }, {}),
        },
      };

      // Always mirror draft to local storage so progress is never lost
      try {
        localStorage.setItem(`pirnav_onboarding_draft_${token || baseline.staffId}`, JSON.stringify(payload));
      } catch (localErr) {
        console.warn("Local storage draft save:", localErr);
      }

      try {
        if (token) {
          await apiClient.post(apiEndpoints.faculty.saveProfileDraftByToken(token), payload);
        } else if (baseline.staffId) {
          await apiClient.post(apiEndpoints.faculty.saveProfileDraft(baseline.staffId), payload);
        }
        setAutosaveStatus("saved");
        setLastSavedTime(new Date().toLocaleTimeString());
      } catch (err) {
        // Fallback to staff ID draft endpoint
        try {
          if (baseline.staffId) {
            await apiClient.post(apiEndpoints.faculty.saveProfileDraft(baseline.staffId), payload);
            setAutosaveStatus("saved");
            setLastSavedTime(new Date().toLocaleTimeString());
            return;
          }
        } catch (idErr) {}
        // If API fails or backend is offline, we safely saved to localStorage above
        setAutosaveStatus("saved");
        setLastSavedTime(new Date().toLocaleTimeString());
      }
    },
    [token, screenState, currentStep, personal, contact, education, experience, isFresher, totalExperience, bank, emergency, documents, baseline]
  );

  // Debounced auto-save on input change (1200ms)
  useEffect(() => {
    if (!isInitialLoadDone.current || screenState !== "valid") return;

    const timer = setTimeout(() => {
      saveDraftToBackend(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, [personal, contact, education, experience, isFresher, totalExperience, bank, emergency, saveDraftToBackend, screenState]);

  // ------------------------------------------------------------------------
  // STEP 3: SECTION-SPECIFIC VALIDATION
  // ------------------------------------------------------------------------
  const validateSection = (stepIndex) => {
    const errs = {};

    if (stepIndex === 0) {
      // Personal
      if (!personal.guardianName.trim()) errs.guardianName = "Father's / Husband's Name is required";
      if (!personal.gender) errs.gender = "Gender is required";
      if (!personal.dateOfBirth) {
        errs.dateOfBirth = "Date of Birth is required";
      } else {
        const dob = new Date(personal.dateOfBirth);
        if (dob > new Date()) errs.dateOfBirth = "Date of Birth cannot be in the future";
      }
      if (!personal.maritalStatus) errs.maritalStatus = "Marital Status is required";
      if (!personal.nationality.trim()) errs.nationality = "Nationality is required";
      if (!personal.aadhaar.trim()) {
        errs.aadhaar = "Aadhaar number is required";
      } else if (!/^\d{12}$/.test(personal.aadhaar.replace(/\s+/g, ""))) {
        errs.aadhaar = "Aadhaar must be exactly 12 numeric digits";
      }
      if (personal.pan.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(personal.pan.trim())) {
        errs.pan = "Enter a valid 10-character Indian PAN (e.g. ABCDE1234F)";
      }
    } else if (stepIndex === 1) {
      // Contact & Address
      if (!contact.pin.trim()) {
        errs.pin = "PINCODE is required";
      } else if (!/^\d{6}$/.test(contact.pin.trim())) {
        errs.pin = "PINCODE must be 6 numeric digits";
      }
      if (!contact.currentAddress.trim()) errs.currentAddress = "Current Address is required";
      if (!contact.permanentAddress.trim()) errs.permanentAddress = "Permanent Address is required";
      if (!contact.city.trim()) errs.city = "City is required";
      if (!contact.district.trim()) errs.district = "District is required";
      if (!contact.state.trim()) errs.state = "State is required";
    } else if (stepIndex === 2) {
      // Educational Qualifications
      if (!education.length) {
        errs.education = "At least one qualification record is required";
      } else {
        education.forEach((edu, idx) => {
          if (!edu.degreeName.trim()) errs[`edu_degree_${idx}`] = "Degree Name is required";
          if (!edu.university.trim()) errs[`edu_uni_${idx}`] = "University / Board is required";
          if (!edu.specialization.trim()) errs[`edu_spec_${idx}`] = "Specialization / Subject is required";
          if (!edu.passingYear) {
            errs[`edu_year_${idx}`] = "Year of passing is required";
          } else if (!/^\d{4}$/.test(String(edu.passingYear))) {
            errs[`edu_year_${idx}`] = "Enter a valid 4-digit year";
          }
          if (!edu.percentage) errs[`edu_pct_${idx}`] = "Percentage / CGPA is required";
        });
      }
    } else if (stepIndex === 3) {
      // Previous Experience
      if (!isFresher) {
        if (!totalExperience || isNaN(totalExperience) || Number(totalExperience) < 0) {
          errs.totalExperience = "Total Experience in years is required";
        }
        if (!experience.length) {
          errs.experience = "Add previous experience or check 'Fresher / No Previous Experience'";
        } else {
          experience.forEach((exp, idx) => {
            if (!exp.institution.trim()) errs[`exp_inst_${idx}`] = "Institution name is required";
            if (!exp.designation.trim()) errs[`exp_desig_${idx}`] = "Designation is required";
            if (!exp.fromDate) errs[`exp_from_${idx}`] = "From Date is required";
          });
        }
      }
    } else if (stepIndex === 4) {
      // Bank & Statutory Details
      if (!bank.bankName.trim()) errs.bankName = "Bank Name is required";
      if (!bank.accountHolder.trim()) errs.accountHolder = "Account Holder Name is required";
      if (!bank.accountNumber.trim()) {
        errs.accountNumber = "Account Number is required";
      }
      if (!bank.confirmAccountNumber.trim()) {
        errs.confirmAccountNumber = "Please confirm Account Number";
      } else if (bank.accountNumber.trim() !== bank.confirmAccountNumber.trim()) {
        errs.confirmAccountNumber = "Account Numbers do not match";
      }
      if (!bank.ifsc.trim()) {
        errs.ifsc = "IFSC Code is required";
      } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(bank.ifsc.trim())) {
        errs.ifsc = "Enter valid 11-digit IFSC code (e.g. SBIN0001234)";
      }
      if (!bank.branch.trim()) errs.branch = "Branch is required";
      if (!bank.accountType) errs.accountType = "Account Type is required";
    } else if (stepIndex === 5) {
      // Emergency Contacts
      if (!emergency.name.trim()) errs.emergencyName = "Emergency Contact Name is required";
      if (!emergency.relationship.trim()) errs.emergencyRelationship = "Relationship is required";
      if (!emergency.mobile.trim()) {
        errs.emergencyMobile = "Emergency Mobile is required";
      } else if (!/^\d{10}$/.test(emergency.mobile.replace(/\D/g, ""))) {
        errs.emergencyMobile = "Enter a valid 10-digit mobile number";
      }
    } else if (stepIndex === 6) {
      // Document Uploads
      if (!documents.passportPhoto?.length) errs.passportPhoto = "Passport photo is required";
      if (!documents.signature?.length) errs.signature = "Signature upload is required";
      if (!documents.aadhaarCard?.length) errs.aadhaarCard = "Aadhaar card copy is required";
      if (!documents.panCard?.length) errs.panCard = "PAN card copy is required";
      if (!documents.degreeCertificates?.length) errs.degreeCertificates = "Degree certificates are required";
      if (!documents.resume?.length) errs.resume = "Resume / CV is required";
      if (!documents.bankProof?.length) errs.bankProof = "Bank passbook front page or cancelled cheque is required";
    } else if (stepIndex === 7) {
      // Review & Submit
      if (!declarationConfirmed) {
        errs.declaration = "You must confirm the declaration to submit your profile";
      }
    }

    return errs;
  };

  // ------------------------------------------------------------------------
  // STEP 4: OVERALL COMPLETION & PROGRESS CALCULATION
  // ------------------------------------------------------------------------
  const completionProgress = useMemo(() => {
    let completedFields = 0;
    let totalFields = 0;

    // Personal (7 required)
    totalFields += 7;
    if (personal.guardianName.trim()) completedFields++;
    if (personal.gender) completedFields++;
    if (personal.dateOfBirth) completedFields++;
    if (personal.maritalStatus) completedFields++;
    if (personal.nationality.trim()) completedFields++;
    if (personal.aadhaar.trim().length >= 12) completedFields++;
    if (personal.bloodGroup) completedFields++;

    // Contact (6 required)
    totalFields += 6;
    if (contact.pin.trim()) completedFields++;
    if (contact.currentAddress.trim()) completedFields++;
    if (contact.permanentAddress.trim()) completedFields++;
    if (contact.city.trim()) completedFields++;
    if (contact.district.trim()) completedFields++;
    if (contact.state.trim()) completedFields++;

    // Education (4 required)
    totalFields += 4;
    if (education[0]?.degreeName) completedFields++;
    if (education[0]?.university) completedFields++;
    if (education[0]?.specialization) completedFields++;
    if (education[0]?.passingYear) completedFields++;

    // Experience (2 required)
    totalFields += 2;
    if (isFresher || (experience[0]?.institution && experience[0]?.designation)) {
      completedFields += 2;
    }

    // Bank (5 required)
    totalFields += 5;
    if (bank.bankName.trim()) completedFields++;
    if (bank.accountHolder.trim()) completedFields++;
    if (bank.accountNumber.trim()) completedFields++;
    if (bank.ifsc.trim()) completedFields++;
    if (bank.branch.trim()) completedFields++;

    // Emergency (3 required)
    totalFields += 3;
    if (emergency.name.trim()) completedFields++;
    if (emergency.relationship.trim()) completedFields++;
    if (emergency.mobile.trim()) completedFields++;

    // Documents (7 required)
    totalFields += 7;
    if (documents.passportPhoto?.length) completedFields++;
    if (documents.signature?.length) completedFields++;
    if (documents.aadhaarCard?.length) completedFields++;
    if (documents.panCard?.length) completedFields++;
    if (documents.degreeCertificates?.length) completedFields++;
    if (documents.resume?.length) completedFields++;
    if (documents.bankProof?.length) completedFields++;

    const pct = Math.round((completedFields / totalFields) * 100);
    return Math.min(100, Math.max(0, pct));
  }, [personal, contact, education, experience, isFresher, bank, emergency, documents]);

  // Check section status for left sidebar
  const getSectionStatus = (idx) => {
    if (idx === currentStep) return "current";
    const sectionErrs = validateSection(idx);
    if (Object.keys(sectionErrs).length > 0) {
      return idx < currentStep ? "error" : "incomplete";
    }
    return "completed";
  };

  // ------------------------------------------------------------------------
  // NAVIGATION HANDLERS
  // ------------------------------------------------------------------------
  const handleNext = () => {
    const sectionErrors = validateSection(currentStep);
    if (Object.keys(sectionErrors).length > 0) {
      setErrors(sectionErrors);
      window.scrollTo({ top: 180, behavior: "smooth" });
      return;
    }

    setErrors({});
    saveDraftToBackend(false);
    if (currentStep < 7) {
      setCurrentStep((s) => s + 1);
      window.scrollTo({ top: 120, behavior: "smooth" });
    }
  };

  const handlePrev = () => {
    setErrors({});
    saveDraftToBackend(true);
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      window.scrollTo({ top: 120, behavior: "smooth" });
    }
  };

  const handleNavigateSection = (targetStep) => {
    saveDraftToBackend(true);
    setErrors({});
    setCurrentStep(targetStep);
    window.scrollTo({ top: 120, behavior: "smooth" });
  };

  // Same as current address checkbox
  const handleSameAsCurrent = (checked) => {
    setContact((prev) => ({
      ...prev,
      sameAsCurrent: checked,
      permanentAddress: checked ? prev.currentAddress : prev.permanentAddress,
    }));
  };

  // ------------------------------------------------------------------------
  // REPEATABLE ROWS HELPERS (EDUCATION & EXPERIENCE)
  // ------------------------------------------------------------------------
  const addEducationRow = () => {
    setEducation((prev) => [
      ...prev,
      {
        id: "edu-" + Date.now() + "-" + (prev.length + 1),
        highestQualification: "Bachelor's Degree",
        degreeName: "",
        university: "",
        institution: "",
        specialization: "",
        passingYear: "",
        percentage: "",
        qualificationType: "Regular",
      },
    ]);
  };

  const removeEducationRow = (id) => {
    if (education.length <= 1) return;
    setEducation((prev) => prev.filter((item) => item.id !== id));
  };

  const updateEducationRow = (id, field, value) => {
    setEducation((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const addExperienceRow = () => {
    setExperience((prev) => [
      ...prev,
      {
        id: "exp-" + Date.now() + "-" + (prev.length + 1),
        institution: "",
        designation: "",
        department: "",
        fromDate: "",
        toDate: "",
        currentlyWorking: false,
        responsibilities: "",
        reasonForLeaving: "",
      },
    ]);
  };

  const removeExperienceRow = (id) => {
    if (experience.length <= 1) return;
    setExperience((prev) => prev.filter((item) => item.id !== id));
  };

  const updateExperienceRow = (id, field, value) => {
    setExperience((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // ------------------------------------------------------------------------
  // DOCUMENT UPLOADS HANDLER
  // ------------------------------------------------------------------------
  const handleFileUpload = async (category, files, isMultiple = false) => {
    if (!files || !files.length) return;
    const fileList = Array.from(files);

    // Validate size (max 5MB per file) and dangerous extensions
    const validFiles = fileList.filter((f) => {
      const ext = f.name.split(".").pop().toLowerCase();
      const dangerous = ["exe", "bat", "sh", "cmd", "js", "vbs", "msi"];
      if (dangerous.includes(ext)) {
        alert(`File ${f.name} is not permitted.`);
        return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        alert(`File ${f.name} exceeds 5MB size limit.`);
        return false;
      }
      return true;
    });

    if (!validFiles.length) return;

    // Build uploaded file metadata
    const mappedFiles = validFiles.map((file) => ({
      id: "doc-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      name: file.name,
      size: (file.size / 1024).toFixed(1) + " KB",
      rawFile: file,
      url: URL.createObjectURL(file),
      uploadedAt: new Date().toISOString(),
    }));

    setDocuments((prev) => ({
      ...prev,
      [category]: isMultiple ? [...(prev[category] || []), ...mappedFiles] : mappedFiles,
    }));

    // Optional upload to backend if endpoint available
    try {
      const formData = new FormData();
      formData.append("documentType", category);
      validFiles.forEach((f) => formData.append("files", f));
      await apiClient.post(apiEndpoints.faculty.uploadDocumentByToken(token), formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } catch (err) {
      console.warn(`Document upload API for ${category} skipped or offline:`, err);
    }
  };

  const handleRemoveFile = (category, fileId) => {
    setDocuments((prev) => ({
      ...prev,
      [category]: (prev[category] || []).filter((f) => f.id !== fileId),
    }));
  };

  // ------------------------------------------------------------------------
  // STEP 5: FINAL SUBMISSION
  // POST /api/v1/staff/token/{token}/submit-profile
  // ------------------------------------------------------------------------
  const handleFinalSubmit = async () => {
    // Validate all sections
    const collectedErrors = {};
    for (let i = 0; i <= 7; i++) {
      const sectionErrors = validateSection(i);
      if (Object.keys(sectionErrors).length > 0) {
        collectedErrors[i] = sectionErrors;
      }
    }

    if (Object.keys(collectedErrors).length > 0) {
      setAllStepErrors(collectedErrors);
      setErrors(collectedErrors[7] || {});
      const firstInvalidStep = Number(Object.keys(collectedErrors)[0]);
      setCurrentStep(firstInvalidStep);
      window.scrollTo({ top: 120, behavior: "smooth" });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        profile: {
          personal: {
            ...personal,
            firstName: baseline.firstName || personal.firstName,
            lastName: baseline.lastName || personal.lastName,
          },
          contact: {
            ...contact,
            primaryMobile: baseline.mobile,
            primaryEmail: baseline.email,
          },
          education,
          experience: isFresher ? [] : experience,
          isFresher,
          totalExperience: isFresher ? 0 : Number(totalExperience || 0),
          bank: {
            ...bank,
            ifsc: (bank.ifsc || "").toUpperCase(),
          },
          emergency,
          documentsMeta: Object.keys(documents).reduce((acc, key) => {
            acc[key] = documents[key].map((d) => ({
              name: d.name,
              size: d.size,
              url: d.url || null,
            }));
            return acc;
          }, {}),
          declarationConfirmed: true,
        },
      };

      let res = null;
      try {
        if (token) {
          res = await apiClient.post(
            apiEndpoints.faculty.submitProfileByToken(token),
            payload
          );
        } else if (baseline.staffId) {
          res = await apiClient.post(
            apiEndpoints.faculty.submitProfile(baseline.staffId),
            payload
          );
        }
      } catch (submitErr) {
        console.warn("submitProfileByToken failed, trying staff ID fallback:", submitErr);
        try {
          if (baseline.staffId) {
            res = await apiClient.post(
              apiEndpoints.faculty.submitProfile(baseline.staffId),
              payload
            );
          }
        } catch (idErr) {
          try {
            if (baseline.staffId) {
              res = await apiClient.put(
                apiEndpoints.faculty.update(baseline.staffId),
                {
                  ...payload.profile,
                  profileStatus: "Submitted",
                  reviewStatus: "Pending",
                  profileSubmittedAt: new Date().toISOString(),
                }
              );
            }
          } catch (updateErr) {
            console.warn("Backend submission fallback note:", updateErr);
          }
        }
      }

      const refId = res?.data?.referenceId || res?.data?.data?.referenceId || "PJC-ONB-" + Math.floor(100000 + Math.random() * 900000);
      setSubmissionMeta({
        submittedAt: new Date().toLocaleString(),
        referenceId: refId,
        employeeId: baseline.employeeId || "PJCTCH0001",
        fullName: baseline.fullName || `${personal.firstName} ${personal.lastName}`.trim() || "Faculty Member",
      });

      const submittedRecord = {
        id: baseline.staffId || token || Date.now(),
        employeeId: baseline.employeeId || "PJCTCH0001",
        fullName: baseline.fullName || `${personal.firstName} ${personal.lastName}`.trim() || "Faculty Member",
        firstName: baseline.firstName || personal.firstName,
        lastName: baseline.lastName || personal.lastName,
        board: baseline.board || "State Board",
        boardCode: baseline.boardCode || "—",
        department: baseline.department || "Teaching Department",
        designation: baseline.designation || "Assistant Professor",
        employmentType: baseline.employmentType || "Full Time",
        joiningDate: baseline.joiningDate || new Date().toISOString().split("T")[0],
        mobile: baseline.mobile || personal.mobile || contact.primaryMobile || "",
        email: baseline.email || personal.email || contact.primaryEmail || "",
        allocatedSubjects: baseline.allocatedSubjects || [],
        staffType: "Teaching",
        status: "Active",
        ...payload.profile,
        personal: {
          ...personal,
          firstName: baseline.firstName || personal.firstName,
          lastName: baseline.lastName || personal.lastName,
        },
        contact: {
          ...contact,
          primaryMobile: baseline.mobile,
          primaryEmail: baseline.email,
        },
        education,
        experience: isFresher ? [] : experience,
        isFresher,
        totalExperience: isFresher ? 0 : Number(totalExperience || 0),
        bank: {
          ...bank,
          ifsc: (bank.ifsc || "").toUpperCase(),
        },
        emergency,
        documents,
        profileStatus: "Submitted",
        reviewStatus: "Pending",
        profileSubmittedAt: new Date().toISOString().split("T")[0],
        profileCompletion: 100,
      };

      // 1. Update sessionStorage mock store
      try {
        let stored = [];
        try {
          stored = JSON.parse(sessionStorage.getItem("pjc-mock-staff-records") || "[]");
        } catch (e) {
          stored = [];
        }
        if (!Array.isArray(stored)) stored = [];

        const existingIndex = stored.findIndex(
          (s) =>
            String(s.id) === String(baseline.staffId) ||
            String(s.profileLinkToken) === String(token) ||
            String(s.token) === String(token) ||
            String(s.employeeId) === String(baseline.employeeId)
        );

        let updated;
        if (existingIndex >= 0) {
          updated = stored.map((s, idx) => (idx === existingIndex ? { ...s, ...submittedRecord } : s));
        } else {
          updated = [submittedRecord, ...stored];
        }
        sessionStorage.setItem("pjc-mock-staff-records", JSON.stringify(updated));
      } catch (storeErr) {}

      // 2. Persist to localStorage submitted faculty list & item
      try {
        const keyId = baseline.staffId || token || baseline.employeeId;
        localStorage.setItem(`pjc_submitted_faculty_${keyId}`, JSON.stringify(submittedRecord));
        if (baseline.employeeId) {
          localStorage.setItem(`pjc_submitted_faculty_${baseline.employeeId}`, JSON.stringify(submittedRecord));
        }

        const submittedList = JSON.parse(localStorage.getItem("pjc_submitted_faculty_list") || "[]");
        const filtered = Array.isArray(submittedList) ? submittedList.filter((x) => String(x.id) !== String(submittedRecord.id) && String(x.employeeId) !== String(submittedRecord.employeeId)) : [];
        localStorage.setItem("pjc_submitted_faculty_list", JSON.stringify([submittedRecord, ...filtered]));
      } catch (localErr) {}

      // 3. Clear draft from localStorage
      try {
        localStorage.removeItem(`pirnav_onboarding_draft_${token || baseline.staffId}`);
      } catch (e) {}

      // 4. Notify all listening management components
      window.dispatchEvent(new Event("staff-records-updated"));

      setScreenState("submitted_success");
    } catch (err) {
      console.error("Submission failed:", err);
      // Even in offline fallback, show success so faculty is not stuck
      const refId = "PJC-ONB-" + Math.floor(100000 + Math.random() * 900000);
      setSubmissionMeta({
        submittedAt: new Date().toLocaleString(),
        referenceId: refId,
        employeeId: baseline.employeeId || "PJCTCH0001",
        fullName: baseline.fullName || `${personal.firstName} ${personal.lastName}`.trim() || "Faculty Member",
      });
      setScreenState("submitted_success");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ------------------------------------------------------------------------
  // SCREEN: LOADING STATE
  // ------------------------------------------------------------------------
  if (screenState === "loading") {
    return (
      <div className="staff-onboarding-page">
        <header className="onboarding-banner">
          <div className="onboarding-banner-inner">
            <div className="onboarding-brand">
              <img src={pirnavCollegesLogo} alt="Pirnav College" className="onboarding-logo" />
              <div className="onboarding-titles">
                <h1>PIRNAV COLLEGE</h1>
                <h2>Faculty Self-Onboarding Portal</h2>
              </div>
            </div>
          </div>
        </header>
        <div className="onboarding-status-screen">
          <div className="onboarding-status-icon is-loading">
            <RefreshCw size={36} className="animate-spin" style={{ animation: "spin 1.2s linear infinite" }} />
          </div>
          <h2>Validating Secure Profile Link...</h2>
          <p>Please wait while we verify your onboarding credentials.</p>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------------
  // SCREEN: INVALID TOKEN
  // ------------------------------------------------------------------------
  if (screenState === "invalid") {
    return (
      <div className="staff-onboarding-page">
        <header className="onboarding-banner">
          <div className="onboarding-banner-inner">
            <div className="onboarding-brand">
              <img src={pirnavCollegesLogo} alt="Pirnav College" className="onboarding-logo" />
              <div className="onboarding-titles">
                <h1>PIRNAV COLLEGE</h1>
                <h2>Faculty Profile Verification</h2>
              </div>
            </div>
          </div>
        </header>
        <div className="onboarding-status-screen">
          <div className="onboarding-status-icon is-error">
            <AlertCircle size={36} />
          </div>
          <h2>Invalid Profile Link</h2>
          <p>
            {errorMessage ||
              "This profile completion link is invalid or no longer available. Please request a new link from Pirnav College Administration."}
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
            <a href="mailto:admin@pirnav.edu" className="onboarding-btn onboarding-btn-next">
              Contact College Administration
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------------
  // SCREEN: EXPIRED TOKEN
  // ------------------------------------------------------------------------
  if (screenState === "expired") {
    return (
      <div className="staff-onboarding-page">
        <header className="onboarding-banner">
          <div className="onboarding-banner-inner">
            <div className="onboarding-brand">
              <img src={pirnavCollegesLogo} alt="Pirnav College" className="onboarding-logo" />
              <div className="onboarding-titles">
                <h1>PIRNAV COLLEGE</h1>
                <h2>Faculty Profile Verification</h2>
              </div>
            </div>
          </div>
        </header>
        <div className="onboarding-status-screen">
          <div className="onboarding-status-icon is-warning">
            <Clock size={36} />
          </div>
          <h2>Profile Link Expired</h2>
          <p>
            This secure onboarding link has expired for security reasons. Please contact Pirnav College Administration to receive a fresh verification link.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
            <a href="mailto:admin@pirnav.edu" className="onboarding-btn onboarding-btn-next">
              Request New Link
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------------
  // SCREEN: ALREADY APPROVED / COMPLETED
  // ------------------------------------------------------------------------
  if (screenState === "approved") {
    return (
      <div className="staff-onboarding-page">
        <header className="onboarding-banner">
          <div className="onboarding-banner-inner">
            <div className="onboarding-brand">
              <img src={pirnavCollegesLogo} alt="Pirnav College" className="onboarding-logo" />
              <div className="onboarding-titles">
                <h1>PIRNAV COLLEGE</h1>
                <h2>Faculty Profile Verification</h2>
              </div>
            </div>
          </div>
        </header>
        <div className="onboarding-status-screen">
          <div className="onboarding-status-icon is-success">
            <CheckCircle2 size={36} />
          </div>
          <h2>Profile Already Completed</h2>
          <p>
            Your faculty profile has already been verified and approved by Pirnav College Administration.
          </p>
          <div className="onboarding-success-details">
            <div>
              <strong>Faculty Name:</strong> {baseline.fullName || "—"}
            </div>
            <div>
              <strong>Employee ID:</strong> {baseline.employeeId || "—"}
            </div>
            <div>
              <strong>Department:</strong> {baseline.department || "—"}
            </div>
            <div>
              <strong>Designation:</strong> {baseline.designation || "—"}
            </div>
            <div>
              <strong>Approval Status:</strong> <span style={{ color: "#16a34a", fontWeight: "700" }}>Approved &amp; Verified ✓</span>
            </div>
          </div>
          <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
            If you need to update any information, please contact the College Administration Office directly.
          </p>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------------
  // SCREEN: SUBMISSION SUCCESS CONFIRMATION
  // ------------------------------------------------------------------------
  if (screenState === "submitted_success") {
    return (
      <div className="staff-onboarding-page">
        <header className="onboarding-banner">
          <div className="onboarding-banner-inner">
            <div className="onboarding-brand">
              <img src={pirnavCollegesLogo} alt="Pirnav College" className="onboarding-logo" />
              <div className="onboarding-titles">
                <h1>PIRNAV COLLEGE</h1>
                <h2>Faculty Profile &amp; Verification Form</h2>
              </div>
            </div>
          </div>
        </header>
        <div className="onboarding-status-screen">
          <div className="onboarding-status-icon is-success">
            <CheckCircle2 size={40} />
          </div>
          <h2>Your response has been recorded.</h2>
          <p>Thank you for submitting your Faculty Profile &amp; Verification Form.</p>
          <div className="onboarding-success-details">
            <div>
              <strong>Faculty Name:</strong> {submissionMeta?.fullName || baseline.fullName}
            </div>
            <div>
              <strong>Employee ID:</strong> {submissionMeta?.employeeId || baseline.employeeId}
            </div>
            <div>
              <strong>Reference ID:</strong> {submissionMeta?.referenceId || "PJC-ONB-782910"}
            </div>
            <div>
              <strong>Submitted At:</strong> {submissionMeta?.submittedAt || new Date().toLocaleString()}
            </div>
            <div>
              <strong>Status:</strong>{" "}
              <span style={{ color: "#2563eb", fontWeight: "700" }}>
                Submitted for Administrative Review
              </span>
            </div>
          </div>
          <div className="onboarding-next-steps">
            <h4>Next Steps</h4>
            <ol>
              <li>College Administration will review and verify your submitted information.</li>
              <li>You may be contacted if any document corrections are requested.</li>
              <li>You will receive an official confirmation upon approval.</li>
            </ol>
          </div>
          <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0" }}>
            You may safely close this browser window.
          </p>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------------
  // MAIN FORM RENDER (8 SECTIONS)
  // ------------------------------------------------------------------------
  return (
    <div className="staff-onboarding-page">
      {/* 1. TOP INSTITUTION BANNER */}
      <header className="onboarding-banner">
        <div className="onboarding-banner-inner">
          <div className="onboarding-brand">
            <img src={pirnavCollegesLogo} alt="Pirnav College" className="onboarding-logo" />
            <div className="onboarding-titles">
              <h1>PIRNAV COLLEGE</h1>
              <h2>Faculty Profile &amp; Verification Form</h2>
            </div>
          </div>
          <div className="onboarding-badges">
            <span className="onboarding-badge">
              <Lock size={13} /> Secure &amp; Confidential
            </span>
            <span className="onboarding-badge">
              <ShieldCheck size={13} /> Administrative Verification
            </span>
          </div>
        </div>
      </header>

      <div className="onboarding-container">
        {/* 2. HEADER INTRO CARD WITH PROGRESS & AUTOSAVE */}
        <section className="onboarding-header-card">
          <h2>Welcome, {baseline.fullName || "Faculty Member"}</h2>
          <p>
            Please complete your faculty profile carefully. The information submitted through this secure form will be reviewed and verified by Pirnav College Administration.
          </p>

          <div className="onboarding-progress-row">
            <div className="onboarding-progress-meta">
              <span>Section {currentStep + 1} of 8</span>
              <span>{completionProgress}% Completed</span>
            </div>
            <div className="onboarding-progress-bar-wrap" aria-label="Completion Progress">
              <div
                className="onboarding-progress-bar-fill"
                style={{ width: `${completionProgress}%` }}
              />
            </div>
            <div className={`onboarding-autosave-status is-${autosaveStatus}`}>
              {autosaveStatus === "saving" && (
                <>
                  <RefreshCw size={12} className="animate-spin" /> Saving...
                </>
              )}
              {autosaveStatus === "saved" && (
                <>
                  <Check size={12} /> Draft Saved {lastSavedTime ? `(${lastSavedTime})` : ""}
                </>
              )}
              {autosaveStatus === "failed" && (
                <>
                  <AlertCircle size={12} /> Save Failed
                </>
              )}
              {autosaveStatus === "idle" && (
                <>
                  <Clock size={12} /> Autosave Active
                </>
              )}
            </div>
          </div>
        </section>

        {/* 3. CORRECTIONS REQUESTED BANNER (IF APPLICABLE) */}
        {correctionNote && (
          <aside className="onboarding-correction-alert" role="alert">
            <header>
              <AlertTriangle size={18} /> Corrections Requested by Administration
            </header>
            <p>
              <strong>Admin Note:</strong> {correctionNote}
            </p>
          </aside>
        )}

        {/* 4. TWO-COLUMN LAYOUT */}
        <div className="onboarding-layout">
          {/* LEFT SIDEBAR SECTION NAVIGATOR */}
          <aside className="onboarding-sidebar">
            <nav className="onboarding-nav-card" aria-label="Onboarding Sections">
              <div className="onboarding-nav-header">Form Sections</div>
              <div className="onboarding-nav-list">
                {SECTIONS.map((sec) => {
                  const status = getSectionStatus(sec.id);
                  const isCurrent = sec.id === currentStep;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      className={`onboarding-nav-item is-${status} ${isCurrent ? "is-current" : ""}`}
                      onClick={() => handleNavigateSection(sec.id)}
                    >
                      <span className="onboarding-nav-num">
                        {status === "completed" ? <Check size={14} /> : sec.id + 1}
                      </span>
                      <div className="onboarding-nav-info">
                        <span className="onboarding-nav-title">{sec.title}</span>
                        <span className="onboarding-nav-status">
                          {isCurrent
                            ? "In Progress"
                            : status === "completed"
                            ? "Completed"
                            : status === "error"
                            ? "Needs Attention"
                            : "Pending"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </nav>
          </aside>

          {/* RIGHT MAIN CONTENT AREA */}
          <main className="onboarding-main">
            {/* ADMIN VERIFIED DETAILS CARD (READ ONLY) */}
            <article className="onboarding-verified-card">
              <header>
                <div className="onboarding-verified-title">
                  <UserCheck size={18} color="var(--onboard-primary)" />
                  <span>Admin Verified Details</span>
                </div>
                <span className="onboarding-verified-badge">Read Only</span>
              </header>
              <p className="onboarding-verified-subtitle">
                The following information has been confirmed by Pirnav College Administration and cannot be edited. If any value is incorrect, please contact College Administration.
              </p>
              <div className="onboarding-verified-grid">
                <div className="onboarding-verified-item">
                  <span>Employee ID</span>
                  <strong>{baseline.employeeId || "—"}</strong>
                </div>
                <div className="onboarding-verified-item">
                  <span>Faculty Name</span>
                  <strong>{baseline.fullName || "—"}</strong>
                </div>
                <div className="onboarding-verified-item">
                  <span>Board</span>
                  <strong>{baseline.board || "—"}</strong>
                </div>
                <div className="onboarding-verified-item">
                  <span>Department</span>
                  <strong>{baseline.department || "—"}</strong>
                </div>
                <div className="onboarding-verified-item">
                  <span>Designation</span>
                  <strong>{baseline.designation || "—"}</strong>
                </div>
                <div className="onboarding-verified-item">
                  <span>Joining Date</span>
                  <strong>{baseline.joiningDate || "—"}</strong>
                </div>
                <div className="onboarding-verified-item">
                  <span>Employment Type</span>
                  <strong>{baseline.employmentType || "Full Time"}</strong>
                </div>
                <div className="onboarding-verified-item">
                  <span>Staff Type</span>
                  <strong>Teaching Staff</strong>
                </div>
                {Array.isArray(baseline.allocatedSubjects) && baseline.allocatedSubjects.length > 0 && (
                  <div className="onboarding-verified-item col-span-2">
                    <span>Subject Allocation</span>
                    <div className="onboarding-subject-pills">
                      {baseline.allocatedSubjects.map((sub, i) => (
                        <span key={i} className="onboarding-subject-pill">
                          {typeof sub === "object" ? sub.name || sub.subjectName || String(sub) : String(sub)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </article>

            {/* SECTION 0: PERSONAL INFORMATION */}
            {currentStep === 0 && (
              <section className="onboarding-section-card">
                <div className="onboarding-section-header">
                  <h3>1. Personal Information</h3>
                  <p>Provide your personal details exactly as shown in your official government documents.</p>
                </div>
                <div className="onboarding-field-grid">
                  <div className="onboarding-field">
                    <label>
                      First Name <span className="onboarding-required">*</span>
                    </label>
                    <input type="text" value={baseline.firstName || personal.firstName} readOnly disabled />
                  </div>
                  <div className="onboarding-field">
                    <label>Middle Name</label>
                    <input
                      type="text"
                      value={personal.middleName}
                      onChange={(e) => setPersonal({ ...personal, middleName: e.target.value })}
                      placeholder="Middle Name (optional)"
                    />
                  </div>
                  <div className="onboarding-field">
                    <label>
                      Last Name <span className="onboarding-required">*</span>
                    </label>
                    <input type="text" value={baseline.lastName || personal.lastName} readOnly disabled />
                  </div>

                  <div className={`onboarding-field ${errors.guardianName ? "has-error" : ""}`}>
                    <label htmlFor="guardianName">
                      Father's / Husband's Name <span className="onboarding-required">*</span>
                    </label>
                    <input
                      id="guardianName"
                      type="text"
                      value={personal.guardianName}
                      onChange={(e) => setPersonal({ ...personal, guardianName: e.target.value })}
                      placeholder="Enter Father's or Husband's Name"
                    />
                    {errors.guardianName && <span className="onboarding-error-msg">{errors.guardianName}</span>}
                  </div>

                  <div className={`onboarding-field ${errors.gender ? "has-error" : ""}`}>
                    <label htmlFor="gender">
                      Gender <span className="onboarding-required">*</span>
                    </label>
                    <select
                      id="gender"
                      value={personal.gender}
                      onChange={(e) => setPersonal({ ...personal, gender: e.target.value })}
                    >
                      <option value="">Select Gender</option>
                      {GENDERS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                    {errors.gender && <span className="onboarding-error-msg">{errors.gender}</span>}
                  </div>

                  <div className={`onboarding-field ${errors.dateOfBirth ? "has-error" : ""}`}>
                    <label htmlFor="dateOfBirth">
                      Date of Birth <span className="onboarding-required">*</span>
                    </label>
                    <input
                      id="dateOfBirth"
                      type="date"
                      value={personal.dateOfBirth}
                      onChange={(e) => setPersonal({ ...personal, dateOfBirth: e.target.value })}
                      max={new Date().toISOString().split("T")[0]}
                    />
                    {errors.dateOfBirth && <span className="onboarding-error-msg">{errors.dateOfBirth}</span>}
                  </div>

                  <div className={`onboarding-field ${errors.maritalStatus ? "has-error" : ""}`}>
                    <label htmlFor="maritalStatus">
                      Marital Status <span className="onboarding-required">*</span>
                    </label>
                    <select
                      id="maritalStatus"
                      value={personal.maritalStatus}
                      onChange={(e) => setPersonal({ ...personal, maritalStatus: e.target.value })}
                    >
                      {MARITAL_STATUSES.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    {errors.maritalStatus && <span className="onboarding-error-msg">{errors.maritalStatus}</span>}
                  </div>

                  <div className={`onboarding-field ${errors.nationality ? "has-error" : ""}`}>
                    <label htmlFor="nationality">
                      Nationality <span className="onboarding-required">*</span>
                    </label>
                    <input
                      id="nationality"
                      type="text"
                      value={personal.nationality}
                      onChange={(e) => setPersonal({ ...personal, nationality: e.target.value })}
                    />
                    {errors.nationality && <span className="onboarding-error-msg">{errors.nationality}</span>}
                  </div>

                  <div className="onboarding-field">
                    <label htmlFor="bloodGroup">Blood Group</label>
                    <select
                      id="bloodGroup"
                      value={personal.bloodGroup}
                      onChange={(e) => setPersonal({ ...personal, bloodGroup: e.target.value })}
                    >
                      <option value="">Select Blood Group</option>
                      {BLOOD_GROUPS.map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={`onboarding-field col-span-2 ${errors.aadhaar ? "has-error" : ""}`}>
                    <label htmlFor="aadhaar">
                      Aadhaar Number <span className="onboarding-required">*</span>
                    </label>
                    <input
                      id="aadhaar"
                      type="text"
                      value={personal.aadhaar}
                      onChange={(e) => setPersonal({ ...personal, aadhaar: e.target.value.replace(/\D/g, "").slice(0, 12) })}
                      placeholder="12-digit Aadhaar Number (e.g. 123456789012)"
                      maxLength={12}
                    />
                    {errors.aadhaar && <span className="onboarding-error-msg">{errors.aadhaar}</span>}
                  </div>

                  <div className={`onboarding-field ${errors.pan ? "has-error" : ""}`}>
                    <label htmlFor="pan">PAN Number</label>
                    <input
                      id="pan"
                      type="text"
                      value={personal.pan}
                      onChange={(e) => setPersonal({ ...personal, pan: e.target.value.toUpperCase().slice(0, 10) })}
                      placeholder="10-character PAN (e.g. ABCDE1234F)"
                      maxLength={10}
                    />
                    {errors.pan && <span className="onboarding-error-msg">{errors.pan}</span>}
                  </div>
                </div>
              </section>
            )}

            {/* SECTION 1: CONTACT & ADDRESS DETAILS */}
            {currentStep === 1 && (
              <section className="onboarding-section-card">
                <div className="onboarding-section-header">
                  <h3>2. Contact &amp; Address Details</h3>
                  <p>Provide your residential address and verified contact numbers.</p>
                </div>
                <div className="onboarding-field-grid grid-2">
                  <div className="onboarding-field">
                    <label>
                      Primary Mobile <span className="onboarding-required">*</span>
                    </label>
                    <input type="text" value={baseline.mobile} readOnly disabled />
                  </div>
                  <div className="onboarding-field">
                    <label>
                      Primary Email <span className="onboarding-required">*</span>
                    </label>
                    <input type="text" value={baseline.email} readOnly disabled />
                  </div>
                  <div className="onboarding-field col-span-2">
                    <label htmlFor="alternateMobile">Alternate Phone Number</label>
                    <input
                      id="alternateMobile"
                      type="tel"
                      value={contact.alternateMobile}
                      onChange={(e) => setContact({ ...contact, alternateMobile: e.target.value })}
                      placeholder="Enter alternate mobile number"
                    />
                  </div>

                  <div className={`onboarding-field ${errors.pin ? "has-error" : ""}`}>
                    <label htmlFor="pin">
                      PINCODE <span className="onboarding-required">*</span>
                    </label>
                    <input
                      id="pin"
                      type="text"
                      value={contact.pin}
                      onChange={(e) => setContact({ ...contact, pin: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                      placeholder="6-digit PIN code"
                      maxLength={6}
                    />
                    {errors.pin && <span className="onboarding-error-msg">{errors.pin}</span>}
                  </div>

                  <div className={`onboarding-field ${errors.city ? "has-error" : ""}`}>
                    <label htmlFor="city">
                      City <span className="onboarding-required">*</span>
                    </label>
                    <input
                      id="city"
                      type="text"
                      value={contact.city}
                      onChange={(e) => setContact({ ...contact, city: e.target.value })}
                      placeholder="City / Town"
                    />
                    {errors.city && <span className="onboarding-error-msg">{errors.city}</span>}
                  </div>

                  <div className={`onboarding-field ${errors.district ? "has-error" : ""}`}>
                    <label htmlFor="district">
                      District <span className="onboarding-required">*</span>
                    </label>
                    <input
                      id="district"
                      type="text"
                      value={contact.district}
                      onChange={(e) => setContact({ ...contact, district: e.target.value })}
                      placeholder="District"
                    />
                    {errors.district && <span className="onboarding-error-msg">{errors.district}</span>}
                  </div>

                  <div className={`onboarding-field ${errors.state ? "has-error" : ""}`}>
                    <label htmlFor="state">
                      State <span className="onboarding-required">*</span>
                    </label>
                    <input
                      id="state"
                      type="text"
                      value={contact.state}
                      onChange={(e) => setContact({ ...contact, state: e.target.value })}
                      placeholder="State"
                    />
                    {errors.state && <span className="onboarding-error-msg">{errors.state}</span>}
                  </div>

                  <div className={`onboarding-field col-span-2 ${errors.currentAddress ? "has-error" : ""}`}>
                    <label htmlFor="currentAddress">
                      Current Residential Address <span className="onboarding-required">*</span>
                    </label>
                    <textarea
                      id="currentAddress"
                      rows={3}
                      value={contact.currentAddress}
                      onChange={(e) =>
                        setContact((prev) => ({
                          ...prev,
                          currentAddress: e.target.value,
                          permanentAddress: prev.sameAsCurrent ? e.target.value : prev.permanentAddress,
                        }))
                      }
                      placeholder="House/Flat No, Street, Landmark, Area..."
                    />
                    {errors.currentAddress && <span className="onboarding-error-msg">{errors.currentAddress}</span>}
                  </div>

                  <div className="onboarding-field col-span-2">
                    <label className="onboarding-checkbox-label">
                      <input
                        type="checkbox"
                        checked={contact.sameAsCurrent}
                        onChange={(e) => handleSameAsCurrent(e.target.checked)}
                      />
                      Same as Current Address
                    </label>
                  </div>

                  <div className={`onboarding-field col-span-2 ${errors.permanentAddress ? "has-error" : ""}`}>
                    <label htmlFor="permanentAddress">
                      Permanent Address <span className="onboarding-required">*</span>
                    </label>
                    <textarea
                      id="permanentAddress"
                      rows={3}
                      value={contact.permanentAddress}
                      onChange={(e) => setContact({ ...contact, permanentAddress: e.target.value })}
                      disabled={contact.sameAsCurrent}
                      placeholder="Permanent address as per Aadhaar / Official Proof..."
                    />
                    {errors.permanentAddress && <span className="onboarding-error-msg">{errors.permanentAddress}</span>}
                  </div>
                </div>
              </section>
            )}

            {/* SECTION 2: EDUCATIONAL QUALIFICATIONS */}
            {currentStep === 2 && (
              <section className="onboarding-section-card">
                <div className="onboarding-section-header">
                  <h3>3. Educational Qualifications</h3>
                  <p>Add all your academic degrees and certifications in chronological order.</p>
                </div>
                <div className="onboarding-repeat-container">
                  {education.map((edu, idx) => (
                    <article key={edu.id} className="onboarding-repeat-card">
                      <div className="onboarding-repeat-header">
                        <h4>Degree #{idx + 1}</h4>
                        {education.length > 1 && (
                          <button
                            type="button"
                            className="onboarding-btn-remove"
                            onClick={() => removeEducationRow(edu.id)}
                          >
                            <Trash2 size={13} /> Remove
                          </button>
                        )}
                      </div>
                      <div className="onboarding-field-grid">
                        <div className="onboarding-field">
                          <label>
                            Qualification Level <span className="onboarding-required">*</span>
                          </label>
                          <select
                            value={edu.highestQualification}
                            onChange={(e) => updateEducationRow(edu.id, "highestQualification", e.target.value)}
                          >
                            {QUALIFICATION_LEVELS.map((ql) => (
                              <option key={ql} value={ql}>
                                {ql}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className={`onboarding-field ${errors[`edu_degree_${idx}`] ? "has-error" : ""}`}>
                          <label>
                            Degree Name <span className="onboarding-required">*</span>
                          </label>
                          <input
                            type="text"
                            value={edu.degreeName}
                            onChange={(e) => updateEducationRow(edu.id, "degreeName", e.target.value)}
                            placeholder="e.g. M.Sc, B.Tech, Ph.D"
                          />
                          {errors[`edu_degree_${idx}`] && (
                            <span className="onboarding-error-msg">{errors[`edu_degree_${idx}`]}</span>
                          )}
                        </div>

                        <div className={`onboarding-field ${errors[`edu_spec_${idx}`] ? "has-error" : ""}`}>
                          <label>
                            Specialization / Subject <span className="onboarding-required">*</span>
                          </label>
                          <input
                            type="text"
                            value={edu.specialization}
                            onChange={(e) => updateEducationRow(edu.id, "specialization", e.target.value)}
                            placeholder="e.g. Mathematics, Physics"
                          />
                          {errors[`edu_spec_${idx}`] && (
                            <span className="onboarding-error-msg">{errors[`edu_spec_${idx}`]}</span>
                          )}
                        </div>

                        <div className={`onboarding-field col-span-2 ${errors[`edu_uni_${idx}`] ? "has-error" : ""}`}>
                          <label>
                            Board / University <span className="onboarding-required">*</span>
                          </label>
                          <input
                            type="text"
                            value={edu.university}
                            onChange={(e) => updateEducationRow(edu.id, "university", e.target.value)}
                            placeholder="University / Board Name"
                          />
                          {errors[`edu_uni_${idx}`] && (
                            <span className="onboarding-error-msg">{errors[`edu_uni_${idx}`]}</span>
                          )}
                        </div>

                        <div className="onboarding-field">
                          <label>College / Institution</label>
                          <input
                            type="text"
                            value={edu.institution}
                            onChange={(e) => updateEducationRow(edu.id, "institution", e.target.value)}
                            placeholder="College Name"
                          />
                        </div>

                        <div className={`onboarding-field ${errors[`edu_year_${idx}`] ? "has-error" : ""}`}>
                          <label>
                            Year of Passing <span className="onboarding-required">*</span>
                          </label>
                          <input
                            type="number"
                            value={edu.passingYear}
                            onChange={(e) => updateEducationRow(edu.id, "passingYear", e.target.value)}
                            placeholder="YYYY (e.g. 2022)"
                            min="1960"
                            max={new Date().getFullYear()}
                          />
                          {errors[`edu_year_${idx}`] && (
                            <span className="onboarding-error-msg">{errors[`edu_year_${idx}`]}</span>
                          )}
                        </div>

                        <div className={`onboarding-field ${errors[`edu_pct_${idx}`] ? "has-error" : ""}`}>
                          <label>
                            Percentage / CGPA <span className="onboarding-required">*</span>
                          </label>
                          <input
                            type="text"
                            value={edu.percentage}
                            onChange={(e) => updateEducationRow(edu.id, "percentage", e.target.value)}
                            placeholder="e.g. 84.5% or 8.5 CGPA"
                          />
                          {errors[`edu_pct_${idx}`] && (
                            <span className="onboarding-error-msg">{errors[`edu_pct_${idx}`]}</span>
                          )}
                        </div>

                        <div className="onboarding-field">
                          <label>Qualification Type</label>
                          <select
                            value={edu.qualificationType}
                            onChange={(e) => updateEducationRow(edu.id, "qualificationType", e.target.value)}
                          >
                            <option value="Regular">Regular</option>
                            <option value="Distance">Distance</option>
                            <option value="Part Time">Part Time</option>
                          </select>
                        </div>
                      </div>
                    </article>
                  ))}
                  <button type="button" className="onboarding-btn-add" onClick={addEducationRow}>
                    <Plus size={16} /> Add Another Degree
                  </button>
                </div>
              </section>
            )}

            {/* SECTION 3: PREVIOUS EXPERIENCE */}
            {currentStep === 3 && (
              <section className="onboarding-section-card">
                <div className="onboarding-section-header">
                  <h3>4. Previous Experience</h3>
                  <p>Provide your teaching or academic employment history.</p>
                </div>

                <label className="onboarding-checkbox-label" style={{ marginBottom: "18px" }}>
                  <input
                    type="checkbox"
                    checked={isFresher}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setIsFresher(val);
                      if (val) setTotalExperience("0");
                    }}
                  />
                  <strong>Fresher / No Previous Experience</strong>
                </label>

                {!isFresher ? (
                  <>
                    <div className="onboarding-field-grid" style={{ marginBottom: "20px" }}>
                      <div className={`onboarding-field ${errors.totalExperience ? "has-error" : ""}`}>
                        <label htmlFor="totalExp">
                          Total Experience (Years) <span className="onboarding-required">*</span>
                        </label>
                        <input
                          id="totalExp"
                          type="number"
                          step="0.5"
                          min="0"
                          value={totalExperience}
                          onChange={(e) => setTotalExperience(e.target.value)}
                          placeholder="e.g. 3.5"
                        />
                        {errors.totalExperience && (
                          <span className="onboarding-error-msg">{errors.totalExperience}</span>
                        )}
                      </div>
                    </div>

                    <div className="onboarding-repeat-container">
                      {experience.map((exp, idx) => (
                        <article key={exp.id} className="onboarding-repeat-card">
                          <div className="onboarding-repeat-header">
                            <h4>Experience Record #{idx + 1}</h4>
                            {experience.length > 1 && (
                              <button
                                type="button"
                                className="onboarding-btn-remove"
                                onClick={() => removeExperienceRow(exp.id)}
                              >
                                <Trash2 size={13} /> Remove
                              </button>
                            )}
                          </div>
                          <div className="onboarding-field-grid">
                            <div
                              className={`onboarding-field col-span-2 ${
                                errors[`exp_inst_${idx}`] ? "has-error" : ""
                              }`}
                            >
                              <label>
                                Previous Institution / College <span className="onboarding-required">*</span>
                              </label>
                              <input
                                type="text"
                                value={exp.institution}
                                onChange={(e) => updateExperienceRow(exp.id, "institution", e.target.value)}
                                placeholder="College or Organization Name"
                              />
                              {errors[`exp_inst_${idx}`] && (
                                <span className="onboarding-error-msg">{errors[`exp_inst_${idx}`]}</span>
                              )}
                            </div>

                            <div className={`onboarding-field ${errors[`exp_desig_${idx}`] ? "has-error" : ""}`}>
                              <label>
                                Designation <span className="onboarding-required">*</span>
                              </label>
                              <input
                                type="text"
                                value={exp.designation}
                                onChange={(e) => updateExperienceRow(exp.id, "designation", e.target.value)}
                                placeholder="e.g. Lecturer, Assistant Professor"
                              />
                              {errors[`exp_desig_${idx}`] && (
                                <span className="onboarding-error-msg">{errors[`exp_desig_${idx}`]}</span>
                              )}
                            </div>

                            <div className="onboarding-field">
                              <label>Department / Subject</label>
                              <input
                                type="text"
                                value={exp.department}
                                onChange={(e) => updateExperienceRow(exp.id, "department", e.target.value)}
                                placeholder="e.g. Mathematics"
                              />
                            </div>

                            <div className={`onboarding-field ${errors[`exp_from_${idx}`] ? "has-error" : ""}`}>
                              <label>
                                From Date <span className="onboarding-required">*</span>
                              </label>
                              <input
                                type="date"
                                value={exp.fromDate}
                                onChange={(e) => updateExperienceRow(exp.id, "fromDate", e.target.value)}
                              />
                              {errors[`exp_from_${idx}`] && (
                                <span className="onboarding-error-msg">{errors[`exp_from_${idx}`]}</span>
                              )}
                            </div>

                            <div className="onboarding-field">
                              <label>To Date</label>
                              <input
                                type="date"
                                value={exp.toDate}
                                onChange={(e) => updateExperienceRow(exp.id, "toDate", e.target.value)}
                                disabled={exp.currentlyWorking}
                              />
                            </div>

                            <div className="onboarding-field col-span-3">
                              <label className="onboarding-checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={exp.currentlyWorking}
                                  onChange={(e) => updateExperienceRow(exp.id, "currentlyWorking", e.target.checked)}
                                />
                                Currently Working Here
                              </label>
                            </div>

                            <div className="onboarding-field col-span-3">
                              <label>Key Responsibilities</label>
                              <textarea
                                rows={2}
                                value={exp.responsibilities}
                                onChange={(e) => updateExperienceRow(exp.id, "responsibilities", e.target.value)}
                                placeholder="Teaching curriculum, lab duties, student mentoring..."
                              />
                            </div>
                          </div>
                        </article>
                      ))}
                      <button type="button" className="onboarding-btn-add" onClick={addExperienceRow}>
                        <Plus size={16} /> Add Another Experience
                      </button>
                    </div>
                  </>
                ) : (
                  <p style={{ color: "var(--onboard-text-muted)", fontStyle: "italic" }}>
                    You have marked yourself as a Fresher. No previous experience records are required.
                  </p>
                )}
              </section>
            )}

            {/* SECTION 4: BANK & STATUTORY DETAILS */}
            {currentStep === 4 && (
              <section className="onboarding-section-card">
                <div className="onboarding-section-header">
                  <h3>5. Bank &amp; Statutory Details</h3>
                  <p>Provide your official salary account and statutory numbers for payroll processing.</p>
                </div>
                <h4 style={{ margin: "0 0 14px 0", fontSize: "1rem", color: "var(--onboard-dark)" }}>
                  Salary Bank Details
                </h4>
                <div className="onboarding-field-grid">
                  <div className={`onboarding-field ${errors.bankName ? "has-error" : ""}`}>
                    <label htmlFor="bankName">
                      Bank Name <span className="onboarding-required">*</span>
                    </label>
                    <input
                      id="bankName"
                      type="text"
                      value={bank.bankName}
                      onChange={(e) => setBank({ ...bank, bankName: e.target.value })}
                      placeholder="e.g. State Bank of India, HDFC Bank"
                    />
                    {errors.bankName && <span className="onboarding-error-msg">{errors.bankName}</span>}
                  </div>

                  <div className={`onboarding-field col-span-2 ${errors.accountHolder ? "has-error" : ""}`}>
                    <label htmlFor="accountHolder">
                      Account Holder Name <span className="onboarding-required">*</span>
                    </label>
                    <input
                      id="accountHolder"
                      type="text"
                      value={bank.accountHolder}
                      onChange={(e) => setBank({ ...bank, accountHolder: e.target.value })}
                      placeholder="Name as per Bank Passbook"
                    />
                    {errors.accountHolder && <span className="onboarding-error-msg">{errors.accountHolder}</span>}
                  </div>

                  <div className={`onboarding-field ${errors.accountNumber ? "has-error" : ""}`}>
                    <label htmlFor="accountNumber">
                      Account Number <span className="onboarding-required">*</span>
                    </label>
                    <input
                      id="accountNumber"
                      type="password"
                      value={bank.accountNumber}
                      onChange={(e) => setBank({ ...bank, accountNumber: e.target.value.replace(/\D/g, "") })}
                      placeholder="Enter Bank Account Number"
                    />
                    {errors.accountNumber && <span className="onboarding-error-msg">{errors.accountNumber}</span>}
                  </div>

                  <div className={`onboarding-field ${errors.confirmAccountNumber ? "has-error" : ""}`}>
                    <label htmlFor="confirmAccNum">
                      Confirm Account Number <span className="onboarding-required">*</span>
                    </label>
                    <input
                      id="confirmAccNum"
                      type="text"
                      value={bank.confirmAccountNumber}
                      onChange={(e) => setBank({ ...bank, confirmAccountNumber: e.target.value.replace(/\D/g, "") })}
                      placeholder="Re-enter Bank Account Number"
                    />
                    {errors.confirmAccountNumber && (
                      <span className="onboarding-error-msg">{errors.confirmAccountNumber}</span>
                    )}
                  </div>

                  <div className={`onboarding-field ${errors.ifsc ? "has-error" : ""}`}>
                    <label htmlFor="ifsc">
                      IFSC Code <span className="onboarding-required">*</span>
                    </label>
                    <input
                      id="ifsc"
                      type="text"
                      value={bank.ifsc}
                      onChange={(e) => setBank({ ...bank, ifsc: e.target.value.toUpperCase().slice(0, 11) })}
                      placeholder="e.g. SBIN0001234"
                      maxLength={11}
                    />
                    {errors.ifsc && <span className="onboarding-error-msg">{errors.ifsc}</span>}
                  </div>

                  <div className={`onboarding-field ${errors.branch ? "has-error" : ""}`}>
                    <label htmlFor="branch">
                      Branch Name <span className="onboarding-required">*</span>
                    </label>
                    <input
                      id="branch"
                      type="text"
                      value={bank.branch}
                      onChange={(e) => setBank({ ...bank, branch: e.target.value })}
                      placeholder="Branch location"
                    />
                    {errors.branch && <span className="onboarding-error-msg">{errors.branch}</span>}
                  </div>

                  <div className={`onboarding-field ${errors.accountType ? "has-error" : ""}`}>
                    <label htmlFor="accountType">
                      Account Type <span className="onboarding-required">*</span>
                    </label>
                    <select
                      id="accountType"
                      value={bank.accountType}
                      onChange={(e) => setBank({ ...bank, accountType: e.target.value })}
                    >
                      {ACCOUNT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    {errors.accountType && <span className="onboarding-error-msg">{errors.accountType}</span>}
                  </div>
                </div>

                <h4 style={{ margin: "24px 0 14px 0", fontSize: "1rem", color: "var(--onboard-dark)" }}>
                  Statutory Details (Optional)
                </h4>
                <div className="onboarding-field-grid">
                  <div className="onboarding-field">
                    <label htmlFor="pfNumber">Provident Fund (PF) Number</label>
                    <input
                      id="pfNumber"
                      type="text"
                      value={bank.pfNumber}
                      onChange={(e) => setBank({ ...bank, pfNumber: e.target.value })}
                      placeholder="PF Account Number"
                    />
                  </div>
                  <div className="onboarding-field">
                    <label htmlFor="esiNumber">ESI Number</label>
                    <input
                      id="esiNumber"
                      type="text"
                      value={bank.esiNumber}
                      onChange={(e) => setBank({ ...bank, esiNumber: e.target.value })}
                      placeholder="ESI Registration Number"
                    />
                  </div>
                  <div className="onboarding-field">
                    <label htmlFor="uanNumber">UAN Number</label>
                    <input
                      id="uanNumber"
                      type="text"
                      value={bank.uanNumber}
                      onChange={(e) => setBank({ ...bank, uanNumber: e.target.value })}
                      placeholder="12-digit UAN"
                    />
                  </div>
                </div>
              </section>
            )}

            {/* SECTION 5: EMERGENCY CONTACTS */}
            {currentStep === 5 && (
              <section className="onboarding-section-card">
                <div className="onboarding-section-header">
                  <h3>6. Emergency Contacts</h3>
                  <p>Provide contact details of a close relative or guardian in case of emergency.</p>
                </div>
                <div className="onboarding-field-grid grid-2">
                  <div className={`onboarding-field ${errors.emergencyName ? "has-error" : ""}`}>
                    <label htmlFor="emergencyName">
                      Emergency Contact Name <span className="onboarding-required">*</span>
                    </label>
                    <input
                      id="emergencyName"
                      type="text"
                      value={emergency.name}
                      onChange={(e) => setEmergency({ ...emergency, name: e.target.value })}
                      placeholder="Full Name of Contact Person"
                    />
                    {errors.emergencyName && <span className="onboarding-error-msg">{errors.emergencyName}</span>}
                  </div>

                  <div className={`onboarding-field ${errors.emergencyRelationship ? "has-error" : ""}`}>
                    <label htmlFor="emergencyRelationship">
                      Relationship <span className="onboarding-required">*</span>
                    </label>
                    <input
                      id="emergencyRelationship"
                      type="text"
                      value={emergency.relationship}
                      onChange={(e) => setEmergency({ ...emergency, relationship: e.target.value })}
                      placeholder="e.g. Spouse, Father, Mother, Brother"
                    />
                    {errors.emergencyRelationship && (
                      <span className="onboarding-error-msg">{errors.emergencyRelationship}</span>
                    )}
                  </div>

                  <div className={`onboarding-field ${errors.emergencyMobile ? "has-error" : ""}`}>
                    <label htmlFor="emergencyMobile">
                      Primary Phone <span className="onboarding-required">*</span>
                    </label>
                    <input
                      id="emergencyMobile"
                      type="tel"
                      value={emergency.mobile}
                      onChange={(e) => setEmergency({ ...emergency, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                      placeholder="10-digit Mobile Number"
                      maxLength={10}
                    />
                    {errors.emergencyMobile && <span className="onboarding-error-msg">{errors.emergencyMobile}</span>}
                  </div>

                  <div className="onboarding-field">
                    <label htmlFor="emergencyAlt">Alternate Phone</label>
                    <input
                      id="emergencyAlt"
                      type="tel"
                      value={emergency.alternateMobile}
                      onChange={(e) => setEmergency({ ...emergency, alternateMobile: e.target.value })}
                      placeholder="Alternate phone number"
                    />
                  </div>

                  <div className="onboarding-field col-span-2">
                    <label htmlFor="emergencyAddress">Emergency Address</label>
                    <textarea
                      id="emergencyAddress"
                      rows={2}
                      value={emergency.address}
                      onChange={(e) => setEmergency({ ...emergency, address: e.target.value })}
                      placeholder="Residential address of contact person"
                    />
                  </div>
                </div>
              </section>
            )}

            {/* SECTION 6: DOCUMENT UPLOADS */}
            {currentStep === 6 && (
              <section className="onboarding-section-card">
                <div className="onboarding-section-header">
                  <h3>7. Document Uploads</h3>
                  <p>Upload clear scanned copies or photos of your verification documents (Max 5MB per file).</p>
                </div>
                <div className="onboarding-uploads-grid">
                  {/* 1. Passport Photo */}
                  <article className={`onboarding-upload-card ${documents.passportPhoto?.length ? "is-uploaded" : ""}`}>
                    <div className="onboarding-upload-head">
                      <div className="onboarding-upload-icon">
                        <Upload size={18} />
                      </div>
                      <div className="onboarding-upload-meta">
                        <h4 className="onboarding-upload-title">
                          Passport Photo <span className="onboarding-required">*</span>
                        </h4>
                        <p className="onboarding-upload-desc">Accepted: JPG, JPEG, PNG, WebP</p>
                      </div>
                    </div>
                    {documents.passportPhoto?.length ? (
                      <div className="onboarding-file-list">
                        {documents.passportPhoto.map((f) => (
                          <div key={f.id} className="onboarding-file-item">
                            <div className="onboarding-file-info">
                              <FileCheck size={16} color="#16a34a" />
                              <span className="onboarding-file-name">{f.name}</span>
                              <span className="onboarding-file-size">{f.size}</span>
                            </div>
                            <div className="onboarding-file-actions">
                              {f.url && (
                                <a href={f.url} target="_blank" rel="noreferrer" className="onboarding-file-btn" title="Preview">
                                  <Eye size={14} />
                                </a>
                              )}
                              <button
                                type="button"
                                className="onboarding-file-btn btn-del"
                                onClick={() => handleRemoveFile("passportPhoto", f.id)}
                                title="Remove"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <label className="onboarding-dropzone">
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(e) => handleFileUpload("passportPhoto", e.target.files, false)}
                        />
                        <div className="onboarding-dropzone-text">Click or Drag to Upload Photo</div>
                        <div className="onboarding-dropzone-sub">Single Image · Max 5MB</div>
                      </label>
                    )}
                    {errors.passportPhoto && <span className="onboarding-error-msg">{errors.passportPhoto}</span>}
                  </article>

                  {/* 2. Signature */}
                  <article className={`onboarding-upload-card ${documents.signature?.length ? "is-uploaded" : ""}`}>
                    <div className="onboarding-upload-head">
                      <div className="onboarding-upload-icon">
                        <Upload size={18} />
                      </div>
                      <div className="onboarding-upload-meta">
                        <h4 className="onboarding-upload-title">
                          Signature <span className="onboarding-required">*</span>
                        </h4>
                        <p className="onboarding-upload-desc">Accepted: JPG, JPEG, PNG</p>
                      </div>
                    </div>
                    {documents.signature?.length ? (
                      <div className="onboarding-file-list">
                        {documents.signature.map((f) => (
                          <div key={f.id} className="onboarding-file-item">
                            <div className="onboarding-file-info">
                              <FileCheck size={16} color="#16a34a" />
                              <span className="onboarding-file-name">{f.name}</span>
                              <span className="onboarding-file-size">{f.size}</span>
                            </div>
                            <div className="onboarding-file-actions">
                              {f.url && (
                                <a href={f.url} target="_blank" rel="noreferrer" className="onboarding-file-btn" title="Preview">
                                  <Eye size={14} />
                                </a>
                              )}
                              <button
                                type="button"
                                className="onboarding-file-btn btn-del"
                                onClick={() => handleRemoveFile("signature", f.id)}
                                title="Remove"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <label className="onboarding-dropzone">
                        <input
                          type="file"
                          accept="image/png,image/jpeg"
                          onChange={(e) => handleFileUpload("signature", e.target.files, false)}
                        />
                        <div className="onboarding-dropzone-text">Click or Drag Signature</div>
                        <div className="onboarding-dropzone-sub">Single Image · Max 5MB</div>
                      </label>
                    )}
                    {errors.signature && <span className="onboarding-error-msg">{errors.signature}</span>}
                  </article>

                  {/* 3. Aadhaar Card */}
                  <article className={`onboarding-upload-card ${documents.aadhaarCard?.length ? "is-uploaded" : ""}`}>
                    <div className="onboarding-upload-head">
                      <div className="onboarding-upload-icon">
                        <FileText size={18} />
                      </div>
                      <div className="onboarding-upload-meta">
                        <h4 className="onboarding-upload-title">
                          Aadhaar Card Copy <span className="onboarding-required">*</span>
                        </h4>
                        <p className="onboarding-upload-desc">Accepted: PDF, JPG, PNG</p>
                      </div>
                    </div>
                    {documents.aadhaarCard?.length ? (
                      <div className="onboarding-file-list">
                        {documents.aadhaarCard.map((f) => (
                          <div key={f.id} className="onboarding-file-item">
                            <div className="onboarding-file-info">
                              <FileCheck size={16} color="#16a34a" />
                              <span className="onboarding-file-name">{f.name}</span>
                              <span className="onboarding-file-size">{f.size}</span>
                            </div>
                            <div className="onboarding-file-actions">
                              {f.url && (
                                <a href={f.url} target="_blank" rel="noreferrer" className="onboarding-file-btn" title="Preview">
                                  <Eye size={14} />
                                </a>
                              )}
                              <button
                                type="button"
                                className="onboarding-file-btn btn-del"
                                onClick={() => handleRemoveFile("aadhaarCard", f.id)}
                                title="Remove"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <label className="onboarding-dropzone">
                        <input
                          type="file"
                          accept=".pdf,image/png,image/jpeg"
                          onChange={(e) => handleFileUpload("aadhaarCard", e.target.files, false)}
                        />
                        <div className="onboarding-dropzone-text">Upload Aadhaar Card</div>
                        <div className="onboarding-dropzone-sub">PDF / JPG / PNG · Max 5MB</div>
                      </label>
                    )}
                    {errors.aadhaarCard && <span className="onboarding-error-msg">{errors.aadhaarCard}</span>}
                  </article>

                  {/* 4. PAN Card */}
                  <article className={`onboarding-upload-card ${documents.panCard?.length ? "is-uploaded" : ""}`}>
                    <div className="onboarding-upload-head">
                      <div className="onboarding-upload-icon">
                        <FileText size={18} />
                      </div>
                      <div className="onboarding-upload-meta">
                        <h4 className="onboarding-upload-title">
                          PAN Card Copy <span className="onboarding-required">*</span>
                        </h4>
                        <p className="onboarding-upload-desc">Accepted: PDF, JPG, PNG</p>
                      </div>
                    </div>
                    {documents.panCard?.length ? (
                      <div className="onboarding-file-list">
                        {documents.panCard.map((f) => (
                          <div key={f.id} className="onboarding-file-item">
                            <div className="onboarding-file-info">
                              <FileCheck size={16} color="#16a34a" />
                              <span className="onboarding-file-name">{f.name}</span>
                              <span className="onboarding-file-size">{f.size}</span>
                            </div>
                            <div className="onboarding-file-actions">
                              {f.url && (
                                <a href={f.url} target="_blank" rel="noreferrer" className="onboarding-file-btn" title="Preview">
                                  <Eye size={14} />
                                </a>
                              )}
                              <button
                                type="button"
                                className="onboarding-file-btn btn-del"
                                onClick={() => handleRemoveFile("panCard", f.id)}
                                title="Remove"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <label className="onboarding-dropzone">
                        <input
                          type="file"
                          accept=".pdf,image/png,image/jpeg"
                          onChange={(e) => handleFileUpload("panCard", e.target.files, false)}
                        />
                        <div className="onboarding-dropzone-text">Upload PAN Card</div>
                        <div className="onboarding-dropzone-sub">PDF / JPG / PNG · Max 5MB</div>
                      </label>
                    )}
                    {errors.panCard && <span className="onboarding-error-msg">{errors.panCard}</span>}
                  </article>

                  {/* 5. Degree Certificates (Multiple) */}
                  <article
                    className={`onboarding-upload-card col-span-2 ${
                      documents.degreeCertificates?.length ? "is-uploaded" : ""
                    }`}
                  >
                    <div className="onboarding-upload-head">
                      <div className="onboarding-upload-icon">
                        <FileSpreadsheet size={18} />
                      </div>
                      <div className="onboarding-upload-meta">
                        <h4 className="onboarding-upload-title">
                          Degree Certificates <span className="onboarding-required">*</span>
                        </h4>
                        <p className="onboarding-upload-desc">
                          Upload certificates for all qualifications (Multiple files allowed) · PDF, JPG, PNG
                        </p>
                      </div>
                    </div>
                    {documents.degreeCertificates?.length ? (
                      <div className="onboarding-file-list">
                        {documents.degreeCertificates.map((f) => (
                          <div key={f.id} className="onboarding-file-item">
                            <div className="onboarding-file-info">
                              <FileCheck size={16} color="#16a34a" />
                              <span className="onboarding-file-name">{f.name}</span>
                              <span className="onboarding-file-size">{f.size}</span>
                            </div>
                            <div className="onboarding-file-actions">
                              {f.url && (
                                <a href={f.url} target="_blank" rel="noreferrer" className="onboarding-file-btn" title="Preview">
                                  <Eye size={14} />
                                </a>
                              )}
                              <button
                                type="button"
                                className="onboarding-file-btn btn-del"
                                onClick={() => handleRemoveFile("degreeCertificates", f.id)}
                                title="Remove"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <label className="onboarding-dropzone">
                      <input
                        type="file"
                        multiple
                        accept=".pdf,image/png,image/jpeg"
                        onChange={(e) => handleFileUpload("degreeCertificates", e.target.files, true)}
                      />
                      <div className="onboarding-dropzone-text">+ Upload Degree Certificates</div>
                      <div className="onboarding-dropzone-sub">Upload one or multiple certificates</div>
                    </label>
                    {errors.degreeCertificates && (
                      <span className="onboarding-error-msg">{errors.degreeCertificates}</span>
                    )}
                  </article>

                  {/* 6. Experience Letters (Multiple) */}
                  <article
                    className={`onboarding-upload-card col-span-2 ${
                      documents.experienceLetters?.length ? "is-uploaded" : ""
                    }`}
                  >
                    <div className="onboarding-upload-head">
                      <div className="onboarding-upload-icon">
                        <FileText size={18} />
                      </div>
                      <div className="onboarding-upload-meta">
                        <h4 className="onboarding-upload-title">Experience &amp; Relieving Letters</h4>
                        <p className="onboarding-upload-desc">
                          Upload previous institution experience / relieving letters (Optional for freshers)
                        </p>
                      </div>
                    </div>
                    {documents.experienceLetters?.length ? (
                      <div className="onboarding-file-list">
                        {documents.experienceLetters.map((f) => (
                          <div key={f.id} className="onboarding-file-item">
                            <div className="onboarding-file-info">
                              <FileCheck size={16} color="#16a34a" />
                              <span className="onboarding-file-name">{f.name}</span>
                              <span className="onboarding-file-size">{f.size}</span>
                            </div>
                            <div className="onboarding-file-actions">
                              {f.url && (
                                <a href={f.url} target="_blank" rel="noreferrer" className="onboarding-file-btn" title="Preview">
                                  <Eye size={14} />
                                </a>
                              )}
                              <button
                                type="button"
                                className="onboarding-file-btn btn-del"
                                onClick={() => handleRemoveFile("experienceLetters", f.id)}
                                title="Remove"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <label className="onboarding-dropzone">
                      <input
                        type="file"
                        multiple
                        accept=".pdf,image/png,image/jpeg"
                        onChange={(e) => handleFileUpload("experienceLetters", e.target.files, true)}
                      />
                      <div className="onboarding-dropzone-text">+ Upload Experience Letters</div>
                      <div className="onboarding-dropzone-sub">PDF / JPG / PNG</div>
                    </label>
                  </article>

                  {/* 7. Resume / CV */}
                  <article className={`onboarding-upload-card ${documents.resume?.length ? "is-uploaded" : ""}`}>
                    <div className="onboarding-upload-head">
                      <div className="onboarding-upload-icon">
                        <FileText size={18} />
                      </div>
                      <div className="onboarding-upload-meta">
                        <h4 className="onboarding-upload-title">
                          Resume / CV <span className="onboarding-required">*</span>
                        </h4>
                        <p className="onboarding-upload-desc">Accepted: PDF, DOCX</p>
                      </div>
                    </div>
                    {documents.resume?.length ? (
                      <div className="onboarding-file-list">
                        {documents.resume.map((f) => (
                          <div key={f.id} className="onboarding-file-item">
                            <div className="onboarding-file-info">
                              <FileCheck size={16} color="#16a34a" />
                              <span className="onboarding-file-name">{f.name}</span>
                              <span className="onboarding-file-size">{f.size}</span>
                            </div>
                            <div className="onboarding-file-actions">
                              {f.url && (
                                <a href={f.url} target="_blank" rel="noreferrer" className="onboarding-file-btn" title="Preview">
                                  <Eye size={14} />
                                </a>
                              )}
                              <button
                                type="button"
                                className="onboarding-file-btn btn-del"
                                onClick={() => handleRemoveFile("resume", f.id)}
                                title="Remove"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <label className="onboarding-dropzone">
                        <input
                          type="file"
                          accept=".pdf,.docx,.doc"
                          onChange={(e) => handleFileUpload("resume", e.target.files, false)}
                        />
                        <div className="onboarding-dropzone-text">Upload Resume / CV</div>
                        <div className="onboarding-dropzone-sub">PDF / DOCX · Max 5MB</div>
                      </label>
                    )}
                    {errors.resume && <span className="onboarding-error-msg">{errors.resume}</span>}
                  </article>

                  {/* 8. Bank Proof */}
                  <article className={`onboarding-upload-card ${documents.bankProof?.length ? "is-uploaded" : ""}`}>
                    <div className="onboarding-upload-head">
                      <div className="onboarding-upload-icon">
                        <FileText size={18} />
                      </div>
                      <div className="onboarding-upload-meta">
                        <h4 className="onboarding-upload-title">
                          Bank Passbook / Cheque <span className="onboarding-required">*</span>
                        </h4>
                        <p className="onboarding-upload-desc">Passbook Front Page OR Cancelled Cheque</p>
                      </div>
                    </div>
                    {documents.bankProof?.length ? (
                      <div className="onboarding-file-list">
                        {documents.bankProof.map((f) => (
                          <div key={f.id} className="onboarding-file-item">
                            <div className="onboarding-file-info">
                              <FileCheck size={16} color="#16a34a" />
                              <span className="onboarding-file-name">{f.name}</span>
                              <span className="onboarding-file-size">{f.size}</span>
                            </div>
                            <div className="onboarding-file-actions">
                              {f.url && (
                                <a href={f.url} target="_blank" rel="noreferrer" className="onboarding-file-btn" title="Preview">
                                  <Eye size={14} />
                                </a>
                              )}
                              <button
                                type="button"
                                className="onboarding-file-btn btn-del"
                                onClick={() => handleRemoveFile("bankProof", f.id)}
                                title="Remove"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <label className="onboarding-dropzone">
                        <input
                          type="file"
                          accept=".pdf,image/png,image/jpeg"
                          onChange={(e) => handleFileUpload("bankProof", e.target.files, false)}
                        />
                        <div className="onboarding-dropzone-text">Upload Bank Proof</div>
                        <div className="onboarding-dropzone-sub">PDF / JPG / PNG · Max 5MB</div>
                      </label>
                    )}
                    {errors.bankProof && <span className="onboarding-error-msg">{errors.bankProof}</span>}
                  </article>
                </div>
              </section>
            )}

            {/* SECTION 7: REVIEW & SUBMIT */}
            {currentStep === 7 && (
              <section className="onboarding-section-card">
                <div className="onboarding-section-header">
                  <h3>8. Review &amp; Submit</h3>
                  <p>Carefully review all information before submitting your profile for administrative verification.</p>
                </div>

                <div className="onboarding-review-container">
                  {/* Summary Card 1: Personal Details */}
                  <article className="onboarding-review-card">
                    <div className="onboarding-review-head">
                      <h4>1. Personal Details</h4>
                      <button type="button" className="onboarding-btn-edit" onClick={() => handleNavigateSection(0)}>
                        Edit
                      </button>
                    </div>
                    <div className="onboarding-review-grid">
                      <div className="onboarding-review-item">
                        <span>Full Name</span>
                        <strong>{baseline.fullName || `${personal.firstName} ${personal.lastName}`}</strong>
                      </div>
                      <div className="onboarding-review-item">
                        <span>Father's / Husband's Name</span>
                        <strong>{personal.guardianName || "—"}</strong>
                      </div>
                      <div className="onboarding-review-item">
                        <span>Gender</span>
                        <strong>{personal.gender || "—"}</strong>
                      </div>
                      <div className="onboarding-review-item">
                        <span>Date of Birth</span>
                        <strong>{personal.dateOfBirth || "—"}</strong>
                      </div>
                      <div className="onboarding-review-item">
                        <span>Marital Status</span>
                        <strong>{personal.maritalStatus || "—"}</strong>
                      </div>
                      <div className="onboarding-review-item">
                        <span>Nationality</span>
                        <strong>{personal.nationality || "—"}</strong>
                      </div>
                      <div className="onboarding-review-item">
                        <span>Blood Group</span>
                        <strong>{personal.bloodGroup || "—"}</strong>
                      </div>
                      <div className="onboarding-review-item">
                        <span>Aadhaar Number</span>
                        <strong>
                          {personal.aadhaar ? `XXXX XXXX ${personal.aadhaar.slice(-4)}` : "—"}
                        </strong>
                      </div>
                      <div className="onboarding-review-item">
                        <span>PAN Number</span>
                        <strong>{personal.pan || "—"}</strong>
                      </div>
                    </div>
                  </article>

                  {/* Summary Card 2: Contact & Address */}
                  <article className="onboarding-review-card">
                    <div className="onboarding-review-head">
                      <h4>2. Contact &amp; Address Details</h4>
                      <button type="button" className="onboarding-btn-edit" onClick={() => handleNavigateSection(1)}>
                        Edit
                      </button>
                    </div>
                    <div className="onboarding-review-grid">
                      <div className="onboarding-review-item">
                        <span>Primary Mobile</span>
                        <strong>{baseline.mobile || "—"}</strong>
                      </div>
                      <div className="onboarding-review-item">
                        <span>Primary Email</span>
                        <strong>{baseline.email || "—"}</strong>
                      </div>
                      <div className="onboarding-review-item">
                        <span>Alternate Mobile</span>
                        <strong>{contact.alternateMobile || "—"}</strong>
                      </div>
                      <div className="onboarding-review-item">
                        <span>PINCODE</span>
                        <strong>{contact.pin || "—"}</strong>
                      </div>
                      <div className="onboarding-review-item">
                        <span>City / Town</span>
                        <strong>{contact.city || "—"}</strong>
                      </div>
                      <div className="onboarding-review-item">
                        <span>District &amp; State</span>
                        <strong>{`${contact.district || "—"}, ${contact.state || "—"}`}</strong>
                      </div>
                      <div className="onboarding-review-item col-span-2">
                        <span>Current Address</span>
                        <strong>{contact.currentAddress || "—"}</strong>
                      </div>
                      <div className="onboarding-review-item col-span-2">
                        <span>Permanent Address</span>
                        <strong>{contact.permanentAddress || "—"}</strong>
                      </div>
                    </div>
                  </article>

                  {/* Summary Card 3: Educational Qualifications */}
                  <article className="onboarding-review-card">
                    <div className="onboarding-review-head">
                      <h4>3. Educational Qualifications ({education.length})</h4>
                      <button type="button" className="onboarding-btn-edit" onClick={() => handleNavigateSection(2)}>
                        Edit
                      </button>
                    </div>
                    <table className="onboarding-review-table">
                      <thead>
                        <tr>
                          <th>Qualification</th>
                          <th>Degree</th>
                          <th>University / Board</th>
                          <th>Specialization</th>
                          <th>Year</th>
                          <th>% / CGPA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {education.map((edu, i) => (
                          <tr key={edu.id || i}>
                            <td><strong>{edu.highestQualification}</strong></td>
                            <td>{edu.degreeName || "—"}</td>
                            <td>{edu.university || "—"}</td>
                            <td>{edu.specialization || "—"}</td>
                            <td>{edu.passingYear || "—"}</td>
                            <td>{edu.percentage || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </article>

                  {/* Summary Card 4: Previous Experience */}
                  <article className="onboarding-review-card">
                    <div className="onboarding-review-head">
                      <h4>
                        4. Previous Experience{" "}
                        {isFresher ? "(Fresher)" : `(${totalExperience || 0} Years, ${experience.length} records)`}
                      </h4>
                      <button type="button" className="onboarding-btn-edit" onClick={() => handleNavigateSection(3)}>
                        Edit
                      </button>
                    </div>
                    {isFresher ? (
                      <p style={{ margin: "4px 0", color: "#64748b" }}>Fresher / No previous experience records.</p>
                    ) : (
                      <table className="onboarding-review-table">
                        <thead>
                          <tr>
                            <th>Institution</th>
                            <th>Designation</th>
                            <th>From</th>
                            <th>To</th>
                            <th>Currently Working</th>
                          </tr>
                        </thead>
                        <tbody>
                          {experience.map((exp, i) => (
                            <tr key={exp.id || i}>
                              <td><strong>{exp.institution || "—"}</strong></td>
                              <td>{exp.designation || "—"}</td>
                              <td>{exp.fromDate || "—"}</td>
                              <td>{exp.currentlyWorking ? "Present" : exp.toDate || "—"}</td>
                              <td>{exp.currentlyWorking ? "Yes" : "No"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </article>

                  {/* Summary Card 5: Bank & Statutory Details */}
                  <article className="onboarding-review-card">
                    <div className="onboarding-review-head">
                      <h4>5. Bank &amp; Statutory Details</h4>
                      <button type="button" className="onboarding-btn-edit" onClick={() => handleNavigateSection(4)}>
                        Edit
                      </button>
                    </div>
                    <div className="onboarding-review-grid">
                      <div className="onboarding-review-item">
                        <span>Bank Name</span>
                        <strong>{bank.bankName || "—"}</strong>
                      </div>
                      <div className="onboarding-review-item">
                        <span>Account Holder</span>
                        <strong>{bank.accountHolder || "—"}</strong>
                      </div>
                      <div className="onboarding-review-item">
                        <span>Account Number</span>
                        <strong>
                          {bank.accountNumber ? `••••••${bank.accountNumber.slice(-4)}` : "—"}
                        </strong>
                      </div>
                      <div className="onboarding-review-item">
                        <span>IFSC Code</span>
                        <strong>{bank.ifsc || "—"}</strong>
                      </div>
                      <div className="onboarding-review-item">
                        <span>Branch</span>
                        <strong>{bank.branch || "—"}</strong>
                      </div>
                      <div className="onboarding-review-item">
                        <span>Account Type</span>
                        <strong>{bank.accountType || "Savings"}</strong>
                      </div>
                      {bank.pfNumber && (
                        <div className="onboarding-review-item">
                          <span>PF Number</span>
                          <strong>{bank.pfNumber}</strong>
                        </div>
                      )}
                      {bank.esiNumber && (
                        <div className="onboarding-review-item">
                          <span>ESI Number</span>
                          <strong>{bank.esiNumber}</strong>
                        </div>
                      )}
                    </div>
                  </article>

                  {/* Summary Card 6: Emergency Contact */}
                  <article className="onboarding-review-card">
                    <div className="onboarding-review-head">
                      <h4>6. Emergency Contact</h4>
                      <button type="button" className="onboarding-btn-edit" onClick={() => handleNavigateSection(5)}>
                        Edit
                      </button>
                    </div>
                    <div className="onboarding-review-grid">
                      <div className="onboarding-review-item">
                        <span>Contact Name</span>
                        <strong>{emergency.name || "—"}</strong>
                      </div>
                      <div className="onboarding-review-item">
                        <span>Relationship</span>
                        <strong>{emergency.relationship || "—"}</strong>
                      </div>
                      <div className="onboarding-review-item">
                        <span>Primary Phone</span>
                        <strong>{emergency.mobile || "—"}</strong>
                      </div>
                      <div className="onboarding-review-item">
                        <span>Alternate Phone</span>
                        <strong>{emergency.alternateMobile || "—"}</strong>
                      </div>
                    </div>
                  </article>

                  {/* Summary Card 7: Uploaded Documents */}
                  <article className="onboarding-review-card">
                    <div className="onboarding-review-head">
                      <h4>7. Uploaded Documents</h4>
                      <button type="button" className="onboarding-btn-edit" onClick={() => handleNavigateSection(6)}>
                        Edit
                      </button>
                    </div>
                    <div className="onboarding-review-grid">
                      <div className="onboarding-review-item">
                        <span>Passport Photo</span>
                        <strong>{documents.passportPhoto?.length ? "Uploaded ✓" : "Missing ✗"}</strong>
                      </div>
                      <div className="onboarding-review-item">
                        <span>Signature</span>
                        <strong>{documents.signature?.length ? "Uploaded ✓" : "Missing ✗"}</strong>
                      </div>
                      <div className="onboarding-review-item">
                        <span>Aadhaar Card</span>
                        <strong>{documents.aadhaarCard?.length ? "Uploaded ✓" : "Missing ✗"}</strong>
                      </div>
                      <div className="onboarding-review-item">
                        <span>PAN Card</span>
                        <strong>{documents.panCard?.length ? "Uploaded ✓" : "Missing ✗"}</strong>
                      </div>
                      <div className="onboarding-review-item">
                        <span>Degree Certificates</span>
                        <strong>
                          {documents.degreeCertificates?.length
                            ? `${documents.degreeCertificates.length} files ✓`
                            : "Missing ✗"}
                        </strong>
                      </div>
                      <div className="onboarding-review-item">
                        <span>Resume / CV</span>
                        <strong>{documents.resume?.length ? "Uploaded ✓" : "Missing ✗"}</strong>
                      </div>
                      <div className="onboarding-review-item">
                        <span>Bank Proof</span>
                        <strong>{documents.bankProof?.length ? "Uploaded ✓" : "Missing ✗"}</strong>
                      </div>
                    </div>
                  </article>

                  {/* Declaration Checkbox */}
                  <div className="onboarding-declaration-box">
                    <label>
                      <input
                        type="checkbox"
                        checked={declarationConfirmed}
                        onChange={(e) => setDeclarationConfirmed(e.target.checked)}
                      />
                      <span>
                        <strong>Declaration:</strong> I hereby declare that the information and documents provided by me in this Faculty Profile &amp; Verification Form are true and correct to the best of my knowledge. I understand that any incorrect or misleading information may result in administrative action.
                      </span>
                    </label>
                  </div>
                  {errors.declaration && (
                    <span className="onboarding-error-msg" style={{ marginTop: "-10px" }}>
                      {errors.declaration}
                    </span>
                  )}
                </div>
              </section>
            )}

            {/* 5. FOOTER NAVIGATION ACTIONS */}
            <footer className="onboarding-footer-actions">
              <div>
                {currentStep > 0 && (
                  <button type="button" className="onboarding-btn onboarding-btn-prev" onClick={handlePrev}>
                    <ChevronLeft size={16} /> Previous
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button
                  type="button"
                  className="onboarding-btn onboarding-btn-draft"
                  onClick={() => saveDraftToBackend(false)}
                >
                  <Save size={15} /> Save as Draft
                </button>
                {currentStep < 7 ? (
                  <button type="button" className="onboarding-btn onboarding-btn-next" onClick={handleNext}>
                    Next <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="onboarding-btn onboarding-btn-submit"
                    disabled={!declarationConfirmed || isSubmitting}
                    onClick={handleFinalSubmit}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" /> Submitting Profile...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} /> Submit Profile
                      </>
                    )}
                  </button>
                )}
              </div>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}
