import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, Toast, useForm } from "@/components/common/Ui.jsx";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { addRow, configFor, getRow, updateRow } from "@/data/store.js";

const lookupCache = {
  countries: null,
  patterns: null,
  gradings: null,
  years: null,
  faculty: null,
  statesByCountry: {},
  promises: {},
};

const mapList = (items) => {
  const names = [];
  const map = {};
  (items || []).forEach((it) => {
    const id =
      it.id ??
      it.countryId ??
      it.stateId ??
      it.academicPatternId ??
      it.gradingSystemId ??
      it.academicYearId ??
      it.facultyId ??
      it.CountryId ??
      it.CountryID;
    const name =
      it.name ??
      it.boardName ??
      it.groupName ??
      it.academicLevelName ??
      it.sectionName ??
      it.subjectName ??
      it.countryName ??
      it.stateName ??
      it.patternName ??
      it.levelName ??
      it.academicPatternName ??
      it.gradingSystemName ??
      it.academicYearName ??
      it.fullName ??
      it.CountryName ??
      it.Name;
    if (name) names.push(name);
    if (name && id !== undefined) map[name] = id;
  });
  return { names, map };
};

const unwrapList = (data) => (Array.isArray(data) ? data : data?.data || data?.items || []);

const fetchLookupCached = async (key, fetcher) => {
  if (lookupCache[key]) return lookupCache[key];
  if (lookupCache.promises[key]) return lookupCache.promises[key];
  lookupCache.promises[key] = (async () => {
    const res = await fetcher();
    const mapped = mapList(unwrapList(res.data));
    lookupCache[key] = mapped;
    delete lookupCache.promises[key];
    return mapped;
  })();
  return lookupCache.promises[key];
};

const waitForToken = (timeout = 5000, interval = 200) =>
  new Promise((resolve) => {
    const t = localStorage.getItem("token");
    if (t) return resolve(t);
    let waited = 0;
    const iv = setInterval(() => {
      const tok = localStorage.getItem("token");
      if (tok) {
        clearInterval(iv);
        return resolve(tok);
      }
      waited += interval;
      if (waited >= timeout) {
        clearInterval(iv);
        return resolve(null);
      }
    }, interval);
  });

export default function FormPage({ slug, config, id = null, secondary = false, listPath }) {
  const sectionConfig = configFor(config, secondary);
  const navigate = useNavigate();
  const localExisting = id ? getRow(slug, secondary, id, config) : null;
  const [existing, setExisting] = useState(localExisting);
  const { values, errors, setValue, validate } = useForm(sectionConfig.fields, existing || {});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [countries, setCountries] = useState([]);
  const [countryMap, setCountryMap] = useState({});
  const [states, setStates] = useState([]);
  const [stateMap, setStateMap] = useState({});
  const [patterns, setPatterns] = useState([]);
  const [patternMap, setPatternMap] = useState({});
  const [gradings, setGradings] = useState([]);
  const [gradingMap, setGradingMap] = useState({});
  const [years, setYears] = useState([]);
  const [yearMap, setYearMap] = useState({});
  const [boards, setBoards] = useState([]);
  const [boardMap, setBoardMap] = useState({});
  const [groups, setGroups] = useState([]);
  const [groupMap, setGroupMap] = useState({});
  const [levels, setLevels] = useState([]);
  const [levelMap, setLevelMap] = useState({});
  const [facultyList, setFacultyList] = useState([]);
  const [facultyMap, setFacultyMap] = useState({});
  const [lookupsLoaded, setLookupsLoaded] = useState(false);

  const mode = id ? "Edit" : "Add";
  const label = (sectionConfig.addLabel || sectionConfig.title).replace(/^Add\s+/, "");

  const lookupIds = {
    country: countryMap,
    state: stateMap,
    pattern: patternMap,
    structure: { Intermediate: 1, "10+2": 2, PUC: 3, "Higher Secondary": 4 },
    grading: gradingMap,
    year: yearMap,
    board: boardMap,
    group: groupMap,
    level: levelMap,
    teacher: facultyMap,
  };

  const endpointConfig = {
    boards: {
      buildPayload: () => ({
        boardName: values.name,
        boardCode: values.code,
        description: values.description,
        countryId: lookupIds.country[values.country] ?? 0,
        stateId: values.state ? lookupIds.state[values.state] ?? 0 : null,
        academicPatternId: lookupIds.pattern[values.pattern] ?? 0,
        academicLevelIds: values.structure ? [lookupIds.structure[values.structure] ?? 0] : [],
        internalAssessment: !!values.internal,
        practicalExams: !!values.practical,
        boardExams: !!values.boardExams,
        passPercentage: Number(values.passPercentage) || 0,
        gradingSystemId: lookupIds.grading[values.grading] ?? 0,
        rankCalculation: !!values.rank,
        status: values.status === "Active" || values.status === true,
      }),
      createUrl: apiEndpoints.boards.create,
      updateUrl: (recId) => apiEndpoints.boards.getById(recId),
      toRow: (item) => ({
        id: item.boardId || item.id,
        name: item.boardName || item.name,
        code: item.boardCode || item.code,
        country: item.countryName || item.country,
        state: item.stateName || item.state,
        structure: item.academicLevelNames ? item.academicLevelNames.join(", ") : item.structure,
        status: item.status === true || String(item.status).toLowerCase() === "active" ? "Active" : "Inactive",
        created: item.createdDate ? String(item.createdDate).split("T")[0] : item.created,
      }),
      // Fields that must resolve to a real ID via a lookup map before submit.
      // { formField: [lookupKey, label] }
      requiredLookups: {
        country: ["country", "Country"],
        state: ["state", "State"], // only checked if a value is present (optional field)
        pattern: ["pattern", "Academic Pattern"],
        grading: ["grading", "Grading System"],
      },
    },
    "academic-years": {
      buildPayload: () => ({
        academicYearName: values.name,
        startDate: values.start,
        endDate: values.end,
        admissionStartDate: values.admissionStart,
        admissionEndDate: values.admissionEnd,
        isActive: values.status === "Active" || values.status === true,
      }),
      createUrl: apiEndpoints.academicYears.create,
      updateUrl: (recId) => apiEndpoints.academicYears.getById(recId),
      toRow: (item) => ({
        id: item.academicYearId || item.id,
        name: item.academicYearName || item.name,
        start: item.startDate ? String(item.startDate).split("T")[0] : item.start,
        end: item.endDate ? String(item.endDate).split("T")[0] : item.end,
        admissionStart: item.admissionStartDate ? String(item.admissionStartDate).split("T")[0] : item.admissionStart,
        admissionEnd: item.admissionEndDate ? String(item.admissionEndDate).split("T")[0] : item.admissionEnd,
        status: item.status || (item.isActive ? "Active" : "Inactive") || "Inactive",
      }),
      requiredLookups: {},
    },
    sections: {
      buildPayload: () => ({
        board: values.board,
        academicYearId: lookupIds.year[values.year] ?? 0,
        group: values.group,
        academicLevel: values.level,
        sectionName: values.name,
        roomNumber: values.room,
        classTeacherId: lookupIds.teacher[values.teacher] ?? 0,
        maximumStrength: Number(values.strength) || 0,
        isActive: values.status === "Active" || values.status === true,
      }),
      createUrl: apiEndpoints.sections.create,
      updateUrl: (recId) => apiEndpoints.sections.getById(recId),
      toRow: (item) => ({
        id: item.sectionId || item.id,
        name: item.sectionName || item.name,
        group: item.groupName || item.group,
        level: item.academicLevel || item.academicLevelName || item.level,
        room: item.roomNumber || item.room,
        teacher: item.classTeacherName || item.teacher,
        strength: item.maximumStrength || item.strength,
        status: item.isActive === false ? "Inactive" : "Active",
      }),
      requiredLookups: {
        year: ["year", "Academic Year"],
        teacher: ["teacher", "Class Teacher"],
      },
    },
  };

  // Returns an array of human-readable field labels that are selected but
  // don't resolve to a real ID in their lookup map (e.g. options hadn't
  // loaded yet when the user picked a value, or the label text doesn't
  // match what came back from the API).
  const findUnresolvedLookups = (wiring) => {
    const problems = [];
    const required = wiring.requiredLookups || {};
    Object.entries(required).forEach(([fieldName, [lookupKey, displayLabel]]) => {
      const selected = values[fieldName];
      if (!selected) return; // empty/optional field, let normal validation handle required-ness
      const map = lookupIds[lookupKey] || {};
      if (map[selected] === undefined) {
        problems.push(displayLabel);
      }
    });
    return problems;
  };

  const submit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const wiring = endpointConfig[slug];

    if (wiring) {
      const unresolved = findUnresolvedLookups(wiring);
      if (unresolved.length) {
        setToast(
          `${unresolved.join(", ")} could not be matched to a valid option. ` +
            `Please reselect ${unresolved.length > 1 ? "these fields" : "this field"} and try again.`
        );
        return;
      }
    }

    setSaving(true);

    if (!wiring) {
      (async () => {
        try {
          if (id) await updateRow(slug, secondary, id, values, config);
          else await addRow(slug, secondary, values, config);
          setToast(`${label} ${id ? "updated" : "created"} successfully`);
          navigate(listPath);
        } catch (err) {
          setToast(err?.response?.data?.message || err?.message || "Failed to save record. Please try again.");
        } finally {
          setSaving(false);
        }
      })();
      return;
    }

    const request = id
      ? apiClient.put(wiring.updateUrl(id), wiring.buildPayload())
      : apiClient.post(wiring.createUrl, wiring.buildPayload());

    request
      .then((response) => {
        const saved = wiring.toRow(response.data);
        if (id) updateRow(slug, secondary, id, saved, config);
        else addRow(slug, secondary, saved, config);
        setToast(`${label} ${id ? "updated" : "created"} successfully`);
        navigate(listPath);
      })
      .catch((error) => {
        const message = error?.response?.data?.message || error?.message || "Failed to save record. Please try again.";
        setToast(message);
      })
      .finally(() => {
        setSaving(false);
      });
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const token = await waitForToken();
        if (!token) return;
        // Do not let an optional lookup (for example, faculty) prevent the
        // board-specific lookups from being displayed.
        const results = await Promise.allSettled([
          fetchLookupCached("boards", () => apiClient.get(apiEndpoints.boards.getAll)),
          fetchLookupCached("countries", () => apiClient.get(apiEndpoints.boards.countries)),
          fetchLookupCached("patterns", () => apiClient.get(apiEndpoints.boards.academicPatterns)),
          fetchLookupCached("gradings", () => apiClient.get(apiEndpoints.boards.gradingSystems)),
          fetchLookupCached("levels", () => apiClient.get(apiEndpoints.boards.academicLevels)),
          fetchLookupCached("years", () => apiClient.get(apiEndpoints.academicYears.getAll)),
          fetchLookupCached("faculty", () => apiClient.get("/api/v1/faculty")),
        ]);
        if (!mounted) return;
        const valuesFor = (index) =>
          results[index].status === "fulfilled" ? results[index].value : null;
        const [b, c, p, g, l, y, f] = results.map((_, index) => valuesFor(index));
        if (b) { setBoards(b.names); setBoardMap(b.map); }
        if (c) { setCountries(c.names); setCountryMap(c.map); }
        if (p) { setPatterns(p.names); setPatternMap(p.map); }
        if (g) { setGradings(g.names); setGradingMap(g.map); }
        if (l) { setLevels(l.names); setLevelMap(l.map); }
        if (y) { setYears(y.names); setYearMap(y.map); }
        if (f) { setFacultyList(f.names); setFacultyMap(f.map); }
        setLookupsLoaded(true);
      } catch (err) {
        // silent
      }
    };
    load();
    return () => (mounted = false);
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadStates = async () => {
      const countryId = countryMap[values.country];
      if (!countryId) {
        setStates([]);
        setStateMap({});
        return;
      }
      try {
        const token = await waitForToken();
        if (!token) {
          setStates([]);
          setStateMap({});
          return;
        }
        const cacheKey = `states_${countryId}`;
        let sData;
        if (lookupCache.statesByCountry[countryId]) {
          sData = lookupCache.statesByCountry[countryId];
        } else if (lookupCache.promises[cacheKey]) {
          sData = await lookupCache.promises[cacheKey];
        } else {
          lookupCache.promises[cacheKey] = (async () => {
            const res = await apiClient.get(apiEndpoints.boards.states(countryId));
            const arr = unwrapList(res.data).map((it) => ({
              id: it.id ?? it.stateId ?? it.StateId,
              name: it.name ?? it.stateName ?? it.StateName,
            }));
            lookupCache.statesByCountry[countryId] = arr;
            delete lookupCache.promises[cacheKey];
            return arr;
          })();
          sData = await lookupCache.promises[cacheKey];
        }
        if (!mounted) return;
        const names = sData.map((x) => x.name).filter(Boolean);
        const map = {};
        sData.forEach((x) => x.name && (map[x.name] = x.id));
        setStates(names);
        setStateMap(map);
      } catch (err) {
        setStates([]);
        setStateMap({});
      }
    };
    loadStates();
    return () => (mounted = false);
  }, [values.country, countryMap]);

  useEffect(() => {
    if (!id || !config.api?.getById) return;
    let mounted = true;
    config.api
      .getById(id)
      .then((res) => {
        if (!mounted) return;
        const raw = res.data;
        const mapped = config.api.mapRow ? config.api.mapRow(raw) : raw;
        setExisting(mapped);
        Object.entries(mapped).forEach(([k, v]) => setValue(k, v));
      })
      .catch(() => {
        // silent
      });
    return () => (mounted = false);
  }, [id, config.api]);

  return (
    <DashboardLayout title={`${mode} ${label}`} subtitle={`Fill in the details below and save to ${id ? "update this" : "create a new"} record.`} breadcrumb={[sectionConfig.title]}>
      <div className="cms-form-page">
        <Link to={listPath} className="cms-back-link"><ArrowLeft size={15} /> Back to {sectionConfig.title}</Link>
        <form className="cms-card" onSubmit={submit} noValidate>
          <div className="cms-card-body">
            <div className="cms-form-grid">
              {sectionConfig.fields.map((f) => {
                let opts = f.options || [];
                if (f.name === "board" && boards.length) opts = boards;
                if (f.name === "country" && countries.length) opts = countries;
                if (f.name === "state") opts = states;
                if (f.name === "pattern") opts = patterns;
                if (f.name === "grading") opts = gradings;
                if (f.name === "year" && years.length) opts = years;
                if (f.name === "group" && groups.length) opts = groups;
                if (f.name === "level" && levels.length) opts = levels;
                if (f.name === "teacher" && facultyList.length) opts = facultyList;

                // State options depend on the selected country. Every other
                // select stays usable while its lookup is loading or if the
                // API is temporarily unavailable, so its configured options
                // remain available as a fallback.
                const stillLoading = f.name === "state" && !values.country;

                const field = {
                  ...f,
                  options: opts,
                  disabled: stillLoading,
                  placeholder: stillLoading ? "Loading..." : f.placeholder,
                };
                return <Field key={f.name} field={field} value={values[f.name]} error={errors[f.name]} onChange={setValue} />;
              })}
            </div>
            <div className="cms-form-actions">
              <button type="button" className="cms-btn cms-btn-ghost" onClick={() => navigate(listPath)}>Cancel</button>
              <button type="submit" className="cms-btn cms-btn-primary" disabled={saving}>{saving ? "Saving..." : `Save ${label}`}</button>
            </div>
          </div>
        </form>
      </div>
      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}
