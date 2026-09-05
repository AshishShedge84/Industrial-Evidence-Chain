namespace backend.DTOs.Common;

/// <summary>
/// Generic paginated result envelope matching confirmed Member 3 frontend contract.
/// </summary>
/// <typeparam name="T">Item element type.</typeparam>
public class PagedResult<T>
{
    public IReadOnlyList<T> Items { get; set; } = Array.Empty<T>();
    public int Total { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)Total / PageSize) : 0;
}
