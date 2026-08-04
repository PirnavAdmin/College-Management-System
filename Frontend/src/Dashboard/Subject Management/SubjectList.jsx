import { useEffect, useMemo, useState } from "react";
import {
  getSubjects,
  getSubjectsByGroup,
  getSubjectById,
  deleteSubject,
} from "../../api/authApi";

import { useNavigate } from "react-router-dom";

import {
  FiBookOpen,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiEye,
  FiPlus,
  FiRotateCcw,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";

import "./SubjectManagement.css";


const BOARDS = ["State Board", "CBSE", "ICSE"];

const GROUPS = [
  "MPC",
  "BiPC",
  "CEC",
  "MEC",
  "HEC",
];

const ACADEMIC_LEVELS = [
  "First Year",
  "Second Year",
];

const SUBJECT_TYPES = [
  "Theory",
  "Practical",
  "Language",
  "Elective",
];


const INITIAL_FILTERS = {
  search: "",
  board: "",
  group: "",
  level: "",
  type: "",
};


export default function SubjectList() {

  const navigate = useNavigate();


  const [subjects, setSubjects] = useState([]);

  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const [page, setPage] = useState(1);

  const [rowsPerPage, setRowsPerPage] = useState(5);



  // GET ALL SUBJECTS

  const fetchSubjects = async () => {

    try {

      const response = await getSubjects();

      setSubjects(response.data);

    } catch (error) {

      console.error(
        "Error fetching subjects:",
        error
      );

    }

  };


  useEffect(() => {

    fetchSubjects();

  }, []);





  // FILTER UPDATE

  const updateFilter = (key, value) => {

    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));

    setPage(1);

  };





  const resetFilters = () => {

    setFilters(INITIAL_FILTERS);

    setPage(1);

  };





  // SEARCH + FILTER

  const filtered = useMemo(() => {

    const term =
      filters.search
        .trim()
        .toLowerCase();


    return subjects.filter((subject) => {


      const matchesTerm =
        term === "" ||
        subject.subjectName
          ?.toLowerCase()
          .includes(term) ||
        subject.subjectCode
          ?.toLowerCase()
          .includes(term);



      return (
        matchesTerm &&

        (
          filters.board === "" ||
          subject.board === filters.board
        )

        &&

        (
          filters.level === "" ||
          subject.academicLevel === filters.level
        )

        &&

        (
          filters.type === "" ||
          subject.subjectType === filters.type
        )

      );


    });


  }, [filters, subjects]);





  const totalPages = Math.max(
    1,
    Math.ceil(
      filtered.length / rowsPerPage
    )
  );


  const currentPage = Math.min(
    page,
    totalPages
  );


  const startIndex =
    (currentPage - 1) *
    rowsPerPage;


  const rows =
    filtered.slice(
      startIndex,
      startIndex + rowsPerPage
    );





  const goToAddSubject = () => {

    navigate(
      "/dashboard/subjects/add"
    );

  };





  // VIEW SUBJECT

  const handleView = async (id) => {

    try {

      const response =
        await getSubjectById(id);


      alert(`
Subject Name : ${response.data.subjectName}
Subject Code : ${response.data.subjectCode}
Board        : ${response.data.board}
Group        : ${response.data.group}
Academic     : ${response.data.academicLevel}
Total Marks  : ${response.data.totalMarks}
Passing Marks: ${response.data.passingMarks}
`);

    }
    catch(error){

      console.error(error);

      alert(
        "Unable to fetch subject details"
      );

    }

  };





  // DELETE SUBJECT

  const handleDelete = async (id) => {


    const confirmDelete =
      window.confirm(
        "Are you sure you want to delete this subject?"
      );


    if(!confirmDelete)
      return;



    try {


      await deleteSubject(id);



      setSubjects((prev)=>
        prev.filter(
          (subject)=>
            subject.subjectId !== id
        )
      );



      alert(
        "Subject deleted successfully"
      );


    }
    catch(error){


      console.error(
        "Delete Error:",
        error
      );


      alert(
        "Failed to delete subject"
      );


    }


  };





  return (
    <div className="sm-root">

      <main className="sm-content">
                {/* Breadcrumb */}
        <nav className="sm-breadcrumb" aria-label="Breadcrumb">
          <span>Subject Management</span>
          <span>/</span>
          <span className="is-current">
            Subject List
          </span>
        </nav>


        {/* Header */}
        <div className="sm-header">

          <div>
            <h1>
              Subject List
            </h1>

            <p>
              Manage all subjects configured for your intermediate college.
            </p>
          </div>


          <div className="sm-actions">

            <button
              type="button"
              className="sm-btn sm-btn-outline"
              onClick={resetFilters}
            >
              <FiRotateCcw size={16}/>
              Reset Filters
            </button>


            <button
              type="button"
              className="sm-btn sm-btn-primary"
              onClick={goToAddSubject}
            >
              <FiPlus size={16}/>
              Add New Subject
            </button>

          </div>

        </div>





        {/* Stats */}

        <div className="sm-stats">

          <div className="sm-card sm-stat">

            <span className="sm-stat-icon">
              <FiBookOpen size={18}/>
            </span>


            <div>
              <b>
                {subjects.length}
              </b>

              <span>
                Total Subjects
              </span>

            </div>

          </div>




          <div className="sm-card sm-stat">

            <span className="sm-stat-icon">
              <FiBookOpen size={18}/>
            </span>


            <div>

              <b>
                {GROUPS.length}
              </b>

              <span>
                Groups
              </span>

            </div>


          </div>





          <div className="sm-card sm-stat">


            <span className="sm-stat-icon">
              <FiBookOpen size={18}/>
            </span>


            <div>

              <b>
                {BOARDS.length}
              </b>


              <span>
                Boards
              </span>


            </div>


          </div>


        </div>





        {/* Search + Filters */}

        <section className="sm-card sm-card-pad">


          <div
            className="sm-search"
            style={{
              marginBottom:12
            }}
          >

            <FiSearch size={16}/>


            <input

              type="search"

              placeholder="Search Subject..."

              value={filters.search}

              onChange={(e)=>
                updateFilter(
                  "search",
                  e.target.value
                )
              }

            />


          </div>





          <div className="sm-filter-grid">


            <div className="sm-field">

              <label>
                Board
              </label>


              <select

                className="sm-select"

                value={filters.board}

                onChange={(e)=>
                  updateFilter(
                    "board",
                    e.target.value
                  )
                }

              >

                <option value="">
                  All Boards
                </option>


                {BOARDS.map((board)=>(

                  <option
                    key={board}
                    value={board}
                  >
                    {board}
                  </option>

                ))}

              </select>


            </div>






            <div className="sm-field">

              <label>
                Group
              </label>


              <select

                className="sm-select"

                value={filters.group}

                onChange={async(e)=>{


                  const group =
                    e.target.value;


                  updateFilter(
                    "group",
                    group
                  );


                  try{


                    if(group===""){

                      const response =
                        await getSubjects();

                      setSubjects(
                        response.data
                      );

                    }
                    else{

                      const response =
                        await getSubjectsByGroup(group);


                      setSubjects(
                        response.data
                      );

                    }


                  }
                  catch(error){

                    console.error(error);

                  }


                }}

              >


                <option value="">
                  All Groups
                </option>


                {GROUPS.map((group)=>(

                  <option
                    key={group}
                    value={group}
                  >
                    {group}
                  </option>

                ))}


              </select>


            </div>





            <div className="sm-field">

              <label>
                Academic Level
              </label>


              <select

                className="sm-select"

                value={filters.level}

                onChange={(e)=>
                  updateFilter(
                    "level",
                    e.target.value
                  )
                }

              >

                <option value="">
                  All Levels
                </option>


                {ACADEMIC_LEVELS.map((level)=>(

                  <option
                    key={level}
                    value={level}
                  >
                    {level}
                  </option>

                ))}


              </select>

            </div>





            <div className="sm-field">

              <label>
                Subject Type
              </label>


              <select

                className="sm-select"

                value={filters.type}

                onChange={(e)=>
                  updateFilter(
                    "type",
                    e.target.value
                  )
                }

              >

                <option value="">
                  All Types
                </option>


                {SUBJECT_TYPES.map((type)=>(

                  <option
                    key={type}
                    value={type}
                  >
                    {type}
                  </option>

                ))}


              </select>


            </div>


          </div>


        </section>





        {/* TABLE */}

        <section className="sm-card">

          <div className="sm-table-wrap">


            <table className="sm-table">


              <thead>

                <tr>

                  <th>
                    Subject Name
                  </th>

                  <th>
                    Subject Code
                  </th>

                  <th>
                    Board
                  </th>

                  <th>
                    Group
                  </th>

                  <th>
                    Academic Level
                  </th>

                  <th>
                    Subject Type
                  </th>

                  <th>
                    Maximum Marks
                  </th>

                  <th>
                    Passing Marks
                  </th>

                  <th>
                    Actions
                  </th>

                </tr>

              </thead>




              <tbody>


              {rows.map((subject)=>(


                <tr key={subject.subjectId}>


                  <td>
                    {subject.subjectName}
                  </td>


                  <td>
                    {subject.subjectCode}
                  </td>


                  <td>
                    {subject.board}
                  </td>


                  <td>
                    {subject.group}
                  </td>


                  <td>
                    {subject.academicLevel}
                  </td>


                  <td>
                    {subject.subjectType}
                  </td>


                  <td>
                    {subject.totalMarks}
                  </td>


                  <td>
                    {subject.passingMarks}
                  </td>



                  <td>


                    <button
                      className="sm-act view"
                      onClick={()=>
                        handleView(
                          subject.subjectId
                        )
                      }
                    >
                      <FiEye/>
                    </button>



                    <button
                      className="sm-act edit"
                      onClick={()=>

                        navigate(
                          "/dashboard/subjects/add",
                          {
                            state:{
                              editMode:true,
                              subjectId:
                              subject.subjectId
                            }
                          }

                        )

                      }
                    >

                      <FiEdit2/>

                    </button>




                    <button
                      className="sm-act delete"
                      onClick={()=>
                        handleDelete(
                          subject.subjectId
                        )
                      }
                    >

                      <FiTrash2/>

                    </button>


                  </td>


                </tr>


              ))}


              </tbody>



            </table>


          </div>






          {/* Pagination */}

          <div className="sm-pagination">


            <span>

              Showing {startIndex + 1}-
              {Math.min(
                startIndex + rowsPerPage,
                filtered.length
              )}

              {" "}of{" "}
              {filtered.length}

            </span>





            <div className="sm-pages">


              <button

                className="sm-page"

                disabled={
                  currentPage===1
                }

                onClick={()=>
                  setPage(
                    currentPage-1
                  )
                }

              >

                <FiChevronLeft/>

              </button>




              {Array.from(
                {
                  length:totalPages
                },
                (_,i)=>i+1

              ).map((number)=>(


                <button

                  key={number}

                  className={
                    number===currentPage
                    ?
                    "sm-page is-active"
                    :
                    "sm-page"
                  }


                  onClick={()=>
                    setPage(number)
                  }

                >

                  {number}

                </button>


              ))}



              <button

                className="sm-page"

                disabled={
                  currentPage===totalPages
                }


                onClick={()=>
                  setPage(
                    currentPage+1
                  )
                }

              >

                <FiChevronRight/>

              </button>


            </div>


          </div>



        </section>


      </main>

    </div>
  );

}