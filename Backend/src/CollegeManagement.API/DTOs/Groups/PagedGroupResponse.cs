namespace CollegeManagement.API.DTOs.Groups
{
    public class PagedGroupResponse
    {
        public List<GroupListItemDto> Items { get; set; } = new();

        public int PageNumber { get; set; }

        public int PageSize { get; set; }

        public int TotalCount { get; set; }

        public int TotalPages =>
            PageSize <= 0
                ? 0
                : (int)Math.Ceiling(
                    TotalCount / (double)PageSize);
    }
}