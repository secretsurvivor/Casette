namespace Pencil.Infrastructure.Services;

internal interface IConsole
{
    void Status(string description, Action action);
    T Status<T>(string description, Func<T> func);
    Task StatusAsync(string description, Func<Task> action);
    Task<T> StatusAsync<T>(string description, Func<Task<T>> action);
    void Print(string message);
    void PrintError(string message);
    Task<T> AskAsync<T>(string prompt);
}

internal class Console
{
}
