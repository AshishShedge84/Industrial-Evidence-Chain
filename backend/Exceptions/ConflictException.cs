namespace backend.Exceptions;

/// <summary>
/// Exception thrown when an operation conflicts with the current state of a resource
/// (e.g. duplicate unique key, invalid state transition).
/// Maps to HTTP 409 (Conflict).
/// </summary>
public class ConflictException : Exception
{
    public ConflictException(string message) : base(message)
    {
    }

    public ConflictException(string message, Exception innerException) : base(message, innerException)
    {
    }
}
