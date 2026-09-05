namespace backend.Exceptions;

/// <summary>
/// Exception thrown when client-supplied input or operation violates validation rules.
/// Maps to HTTP 400 (Bad Request).
/// </summary>
public class ValidationException : Exception
{
    public ValidationException(string message) : base(message)
    {
    }

    public ValidationException(string message, Exception innerException) : base(message, innerException)
    {
    }
}
